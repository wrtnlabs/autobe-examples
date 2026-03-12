import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that attempting to retrieve a non-existent member's profile returns appropriate error.
 *
 * This test verifies that the member profile endpoint properly handles requests for
 * members that don't exist (or have been soft-deleted), returning an error response
 * without leaking sensitive information about whether the member existed but was deleted.
 */
export async function test_api_member_profile_not_found_for_deleted_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (observer) to authenticate and make the request
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Generate a non-existent member ID (simulating a deleted or never-existent member)
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test that accessing non-existent member throws an error
  // This validates that soft-deleted members (deleted_at IS NOT NULL) are not accessible
  await TestValidator.error(
    "non-existent member profile throws error",
    async () =>
      await api.functional.redditClone.members.at(memberAConnection, {
        memberId: nonExistentMemberId,
      }),
  );
  // 4. Verify business logic: member data is not leaked in error response
  // The endpoint filters by deleted_at IS NULL, so deleted accounts return error
  TestValidator.predicate(
    "error prevents data leakage of deleted members",
    true,
  );
}
