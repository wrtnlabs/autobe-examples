import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate not-found semantics when adminUser fetches member details by
 * username.
 *
 * Business goals:
 *
 * - Ensure that administrative detail lookup by username does not return
 *   inconsistent partial data for unknown accounts.
 * - Use available APIs only: adminUser join, accountRestriction creation, and
 *   memberUsers.at detail fetch.
 * - We cannot actually create or soft-delete member users with the given SDK
 *   surface, so we interpret the scenario as a pure not-found behavior test
 *   using clearly non-existent usernames.
 *
 * Flow:
 *
 * 1. Join as a new adminUser, establishing authenticated admin context.
 * 2. Create a sample account restriction episode to satisfy dependency
 *    requirements (no direct assertion on it, but we assert its shape).
 * 3. Call memberUsers.at with a first random-looking username and expect not-found
 *    style behavior (an HttpError via TestValidator.error).
 * 4. Call memberUsers.at with a second distinct random-looking username to
 *    simulate the "soft-deleted" case in the scenario, again expecting
 *    consistent not-found behavior. Since we cannot create an actual
 *    soft-deleted row, we only validate that behavior is consistent and does
 *    not suddenly succeed or return contradictory partial records.
 * 5. Confirm via TestValidator.error that both calls fail, without checking
 *    specific HTTP status codes, and that no headers are manipulated manually.
 */
export async function test_api_admin_memberuser_detail_not_found_and_soft_deleted(
  connection: api.IConnection,
) {
  // 1. Join as adminUser to obtain authorized admin context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed at least one account restriction episode
  const now = new Date();
  const startsAt = now.toISOString() as string & tags.Format<"date-time">;
  const endsAtDate = new Date(now.getTime() + 60 * 60 * 1000);
  const endsAt = endsAtDate.toISOString() as string & tags.Format<"date-time">;

  const restrictionBody = {
    account_type: "memberUser",
    scope: "login",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: restrictionBody },
    );
  typia.assert(restriction);

  // 3. Prepare two clearly non-existent usernames
  const nonexistentUsername1 = `nonexistent_${RandomGenerator.alphaNumeric(24)}`;
  const nonexistentUsername2 = `softdeleted_like_${RandomGenerator.alphaNumeric(24)}`;

  // 4. Call detail endpoint for first non-existent username
  await TestValidator.error(
    "admin memberUsers.at should fail for unknown username #1",
    async () => {
      await api.functional.communityPlatform.adminUser.memberUsers.at(
        connection,
        { username: nonexistentUsername1 },
      );
    },
  );

  // 5. Call detail endpoint for second non-existent username simulating soft-deleted
  await TestValidator.error(
    "admin memberUsers.at should fail consistently for unknown username #2",
    async () => {
      await api.functional.communityPlatform.adminUser.memberUsers.at(
        connection,
        { username: nonexistentUsername2 },
      );
    },
  );
}
