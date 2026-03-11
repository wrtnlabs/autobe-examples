import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member data isolation for email verification records.
 *
 * This test validates that members can only access their own email verification
 * records and cannot view other members' verification data. The authorization
 * middleware must enforce data isolation by filtering results to only include
 * records where discussion_board_member_id matches the authenticated member's
 * ID from the JWT token.
 *
 * Test flow:
 * 1. Register member A with authorize_member_join
 * 2. Register member B with authorize_member_join
 * 3. Member A queries email verification list
 * 4. Validate response contains only member A's records
 * 5. Validate member B's records are NOT included
 */
export async function test_api_email_verification_member_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Register member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Member A queries email verification list
  const memberAVerifications =
    await api.functional.discussionBoard.member.email_verifications.index(
      memberAConnection,
      {
        body: {} satisfies IDiscussionBoardMemberEmailVerification.IRequest,
      },
    );
  typia.assert(memberAVerifications);
  // 4. Validate member A's records are present
  TestValidator.predicate(
    "member A has at least one verification record",
    memberAVerifications.data.length > 0,
  );
  // 5. Validate all records belong to member A
  for (const verification of memberAVerifications.data) {
    typia.assert(verification);
    TestValidator.equals(
      "verification record belongs to member A",
      verification.member.id,
      memberA.id,
    );
  }
  // 6. Validate member B's records are NOT included
  const hasMemberBRecord = memberAVerifications.data.some(
    (verification) => verification.member.id === memberB.id,
  );
  TestValidator.predicate(
    "member A cannot see member B's verification records",
    !hasMemberBRecord,
  );
}
