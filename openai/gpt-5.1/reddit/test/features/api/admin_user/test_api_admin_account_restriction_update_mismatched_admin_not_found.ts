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
 * Validate that updating an adminUser account restriction with a mismatched
 * username is rejected.
 *
 * Business intent:
 *
 * - Ensure that PUT
 *   /communityPlatform/adminUser/adminUsers/{username}/accountRestrictions/{accountRestrictionId}
 *   does not allow cross-account tampering.
 * - When the provided username is not associated with the given restriction
 *   episode, the endpoint must behave as a not-found style error and must not
 *   return a successful ICommunityPlatformAccountRestriction response.
 *
 * Flow:
 *
 * 1. Join as an adminUser using POST /auth/adminUser/join and obtain an
 *    authenticated context.
 * 2. Create a new restriction episode using POST
 *    /communityPlatform/adminUser/accountRestrictions.
 * 3. Build a valid ICommunityPlatformAccountRestriction.IUpdate payload.
 * 4. Call the update endpoint with the created restriction id but a different
 *    random username (very unlikely to be linked to this restriction) and the
 *    update body.
 * 5. Assert that the update attempt fails via TestValidator.error, meaning that
 *    the backend rejected the mismatched username + restrictionId combination.
 */
export async function test_api_admin_account_restriction_update_mismatched_admin_not_found(
  connection: api.IConnection,
) {
  // 1. Join as an adminUser to obtain authorized context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new account restriction episode targeting an adminUser-type account
  const now = new Date();
  const startsAt = now.toISOString() as string & tags.Format<"date-time">;
  const endsAt = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const createBody = {
    account_type: "adminUser",
    scope: "login",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const created: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // 3. Prepare a valid update payload
  const updatedStartsAt = new Date(
    now.getTime() + 5 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const updatedEndsAt = new Date(
    now.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const updateBody = {
    scope: "full",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: updatedStartsAt,
    ends_at: updatedEndsAt,
  } satisfies ICommunityPlatformAccountRestriction.IUpdate;

  // 4. Use a mismatched username that differs from the joined admin username
  const mismatchedUsername: string = RandomGenerator.alphabets(14);
  TestValidator.notEquals(
    "mismatched username must differ from acting admin username",
    admin.username,
    mismatchedUsername,
  );

  // 5. Attempt to update using mismatched username and expect an error
  await TestValidator.error(
    "updating restriction with mismatched admin username should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.update(
        connection,
        {
          username: mismatchedUsername,
          accountRestrictionId: created.id,
          body: updateBody,
        },
      );
    },
  );
}
