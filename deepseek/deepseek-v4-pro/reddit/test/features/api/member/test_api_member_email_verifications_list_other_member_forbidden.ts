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
 * Test that a member cannot access another member's email verification tokens.
 *
 * Validates the cross-member authorization check for the email verification listing endpoint. Only the member themselves (or a platform administrator) should be able to view their own verification history. Attempting to access another member's verification tokens while authenticated as a different member must be rejected with 403 Forbidden.
 *
 * 1. Register member A with random credentials to serve as the unauthorized requester.
 * 2. Register member B with random credentials to serve as the target.
 * 3. While authenticated as member A, attempt to retrieve member B's email verification tokens.
 * 4. Expect 403 Forbidden response confirming cross-member access is blocked.
 */
export async function test_api_member_email_verifications_list_other_member_forbidden(
  connection: api.IConnection,
) {
  // 1. Register member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Register member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Member A attempts to list member B's email verification tokens
  await TestValidator.httpError(
    "cannot list other member's email verification tokens",
    403,
    async () => {
      await api.functional.communityHub.members.email_verifications.index(
        memberAConnection,
        {
          username: memberB.username,
          body: {} satisfies ICommunityHubMemberEmailVerification.IRequest,
        },
      );
    },
  );
}
