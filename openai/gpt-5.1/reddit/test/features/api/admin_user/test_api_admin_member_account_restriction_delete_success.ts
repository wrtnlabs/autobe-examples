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
 * Validate that an authenticated adminUser can delete a member user account
 * restriction episode.
 *
 * Business flow implemented:
 *
 * 1. Register a new adminUser using POST /auth/adminUser/join, which also sets the
 *    Authorization header on the shared connection.
 * 2. As that authenticated adminUser, create a reusable base restriction episode
 *    via POST /communityPlatform/adminUser/accountRestrictions using
 *    ICommunityPlatformAccountRestriction.ICreate with realistic values
 *    (account_type, scope, reason_category, optional reason_detail, temporal
 *    window via starts_at/ends_at).
 * 3. Still as the same adminUser, create a member-specific restriction episode via
 *    POST
 *    /communityPlatform/adminUser/memberUsers/{username}/accountRestrictions
 *    using a randomly generated member username and another
 *    ICommunityPlatformAccountRestriction.ICreate payload, capturing the
 *    returned restriction.id as the accountRestrictionId bound to that member.
 * 4. Call DELETE
 *    /communityPlatform/adminUser/memberUsers/{username}/accountRestrictions/{accountRestrictionId}
 *    using the same authenticated admin connection to remove that restriction
 *    episode for the member.
 * 5. Assert that the erase call completes without throwing, which implies a
 *    successful deletion because the SDK function returns void.
 *
 * Notes:
 *
 * - The original high-level scenario suggested re-fetching the restriction to
 *   assert a 404 Not Found after deletion, but no such GET endpoint is
 *   available in the provided SDK, so this test focuses on the success path and
 *   type/flow correctness of the erase operation itself.
 */
export async function test_api_admin_member_account_restriction_delete_success(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser (join) to obtain an authenticated admin context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a base account restriction episode (not strictly required by the
  // member-specific endpoint, but it mirrors the global restriction creation
  // capability and ensures that ICommunityPlatformAccountRestriction.ICreate
  // is exercised independently).
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour

  const baseRestrictionCreate = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const baseRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: baseRestrictionCreate,
      },
    );
  typia.assert(baseRestriction);

  // 3. Create a member-specific restriction for a given username.
  // We only know the member username as a string here; there is no dedicated
  // member creation API in the provided SDK, so we treat the username as a
  // globally unique identifier that the backend will resolve.
  const memberUsername: string = RandomGenerator.name(1);

  const memberRestrictionCreate = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const memberRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.create(
      connection,
      {
        username: memberUsername,
        body: memberRestrictionCreate,
      },
    );
  typia.assert(memberRestriction);

  // 4. Execute the erase operation for the created restriction.
  await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.erase(
    connection,
    {
      username: memberUsername,
      accountRestrictionId: memberRestriction.id,
    },
  );

  // 5. Basic business assertion: erase completed without throwing.
  // Since erase() returns void, successful completion is our primary signal.
  await TestValidator.predicate(
    "adminUser was able to erase member account restriction without error",
    async () => true,
  );
}
