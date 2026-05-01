import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberEmailVerification";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test cross-member email verification scoping to ensure verification records are isolated per member.
 *
 * Validates that an email verification token generated for one member cannot be retrieved through another member's API path. This ensures proper authorization boundaries where verification IDs are scoped to their owning member account.
 *
 * 1. Register Member A via the join endpoint, which generates an email verification token.
 * 2. Register Member B as a separate, distinct member.
 * 3. List Member A's email verification tokens to obtain a valid verificationId owned by Member A.
 * 4. Attempt to retrieve Member A's verificationId using Member B's username and credentials.
 * 5. Expect 404 Not Found — the query filters by both verificationId AND community_hub_member_id, and the cross-member mismatch yields zero matching rows.
 */
export async function test_api_email_verification_cross_member_scoping(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Register Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. List Member A's email verifications to obtain a verificationId
  const memberAVerifications =
    await api.functional.communityHub.members.email_verifications.index(
      memberAConnection,
      {
        username: memberA.username,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityHubMemberEmailVerification.IRequest,
      },
    );
  typia.assert(memberAVerifications);
  TestValidator.predicate(
    "member A has at least one email verification token",
    memberAVerifications.data.length > 0,
  );
  const verificationId: string & tags.Format<"uuid"> =
    memberAVerifications.data[0]!.id;
  // 4. Attempt to retrieve Member A's verification using Member B's username — expect 404
  await TestValidator.httpError(
    "cross-member verification access returns 404",
    404,
    async () => {
      await api.functional.communityHub.members.email_verifications.at(
        memberBConnection,
        {
          username: memberB.username,
          verificationId,
        },
      );
    },
  );
}
