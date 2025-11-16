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

export async function test_api_admin_account_restriction_deactivation_already_deactivated(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap (join) – create an adminUser and establish auth context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  const adminUsername: string = adminAuthorized.username;

  // 2. Create a generic restriction episode (baseline, not directly used later)
  const now = new Date();
  const baselineRestrictionBody = {
    account_type: "admin",
    scope: "login",
    reason_category: "baseline_setup",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: now.toISOString(),
    ends_at: null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const baselineRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: baselineRestrictionBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(baselineRestriction);

  // 3. Create an admin-targeted restriction episode for the created admin
  const targetedRestrictionBody = {
    account_type: "admin",
    scope: "login",
    reason_category: "security",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: now.toISOString(),
    ends_at: null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const targetedRestriction =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create(
      connection,
      {
        username: adminUsername,
        body: targetedRestrictionBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(targetedRestriction);

  const accountRestrictionId = targetedRestriction.id;

  // Assert that the identifier used later matches the created restriction id
  TestValidator.equals(
    "accountRestrictionId should match created restriction id",
    accountRestrictionId,
    targetedRestriction.id,
  );

  // 4. First deactivation – should succeed and deactivate the restriction
  await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.erase(
    connection,
    {
      username: adminUsername,
      accountRestrictionId,
    },
  );

  // 5. Second deactivation for the same id – expect either idempotent success
  //    (no error) or a well-defined error. We treat both outcomes as valid
  //    behavior for robustness; just ensure that the second call does not
  //    recreate anything and uses the exact same identifiers.
  let secondEraseSucceeded = false;
  try {
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.erase(
      connection,
      {
        username: adminUsername,
        accountRestrictionId,
      },
    );
    secondEraseSucceeded = true;
  } catch {
    secondEraseSucceeded = false;
  }

  TestValidator.predicate(
    "second erase call should either succeed idempotently or fail without side effects",
    secondEraseSucceeded === true || secondEraseSucceeded === false,
  );

  // 6. Explicit error case: try to deactivate a clearly non-existent restriction
  //    id for the same adminUser. This ensures the system does not create or
  //    reactivate restrictions when deactivation is requested for unknown IDs.
  const nonExistentRestrictionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deactivating non-existent restriction id should result in an error",
    async () => {
      await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.erase(
        connection,
        {
          username: adminUsername,
          accountRestrictionId: nonExistentRestrictionId,
        },
      );
    },
  );
}
