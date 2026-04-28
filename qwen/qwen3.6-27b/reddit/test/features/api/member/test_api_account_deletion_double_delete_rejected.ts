import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test account deletion idempotency guard by verifying that attempting to delete
 * an already deleted member account returns 404 Not Found.
 *
 * This test validates the specification that the member profile erase endpoint
 * returns 404 Not Found when the member account has already been soft-deleted.
 * The test registers a new member, deletes their account, and then attempts
 * a second deletion to confirm the idempotency guard is properly enforced.
 *
 * 1. Register a new member via POST /redditLikeCommunity/auth/member/join.
 * 2. Delete the member's account via DELETE /redditLikeCommunity/member/profile.
 * 3. Attempt to delete the same member's account again via DELETE endpoint.
 * 4. Verify that the second deletion attempt returns 404 Not Found,
 *    confirming the account is marked as deleted and cannot be deleted again.
 */
export async function test_api_account_deletion_double_delete_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (memberA)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Delete the member's account (first deletion - succeeds with 204 No Content)
  await api.functional.redditLikeCommunity.member.profile.erase(
    memberConnection,
  );
  // 3. Attempt to delete the same account again (should fail with 404 Not Found)
  await TestValidator.httpError(
    "double delete returns 404 Not Found for already deleted account",
    404,
    async () => {
      await api.functional.redditLikeCommunity.member.profile.erase(
        memberConnection,
      );
    },
  );
}
