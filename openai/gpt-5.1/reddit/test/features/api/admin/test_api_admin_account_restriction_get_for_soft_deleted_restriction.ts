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

export async function test_api_admin_account_restriction_get_for_soft_deleted_restriction(
  connection: api.IConnection,
) {
  // 1. Join an admin user to obtain an authenticated admin session
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  const username: string = adminAuthorized.username;

  // 2. Create a generic restriction episode
  const now = new Date();
  const startsAt = new Date(now.getTime() + 1_000).toISOString();
  const endsAt = new Date(now.getTime() + 60_000).toISOString();

  const restrictionCreateBody = {
    account_type: "adminUser",
    scope: RandomGenerator.pick([
      "login",
      "posting",
      "commenting",
      "voting",
      "reporting",
      "full",
    ] as const),
    reason_category: RandomGenerator.pick([
      "abuse",
      "spam",
      "policy_violation",
      "security",
    ] as const),
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const baseRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: restrictionCreateBody,
      },
    );
  typia.assert(baseRestriction);

  const restrictionId: string & tags.Format<"uuid"> = baseRestriction.id;

  // 3. Link the restriction to the admin user via adminUsers/{username}/accountRestrictions
  const linkedRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create(
      connection,
      {
        username,
        body: {
          account_type: restrictionCreateBody.account_type,
          scope: restrictionCreateBody.scope,
          reason_category: restrictionCreateBody.reason_category,
          reason_detail: restrictionCreateBody.reason_detail,
          starts_at: restrictionCreateBody.starts_at,
          ends_at: restrictionCreateBody.ends_at,
        } satisfies ICommunityPlatformAccountRestriction.ICreate,
      },
    );
  typia.assert(linkedRestriction);

  // Ensure linkage is for the same restriction id; depending on implementation,
  // the create endpoint might either reuse the base restriction or create a
  // fresh one. For safety, we only rely on the restriction returned from the
  // linking call for subsequent path parameters.
  const effectiveRestrictionId: string & tags.Format<"uuid"> =
    linkedRestriction.id;

  // Sanity check: before deletion, GET must succeed for the linked restriction
  const fetchedBeforeDelete: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.at(
      connection,
      {
        username,
        accountRestrictionId: effectiveRestrictionId,
      },
    );
  typia.assert(fetchedBeforeDelete);

  TestValidator.equals(
    "fetched restriction id matches linked restriction id before deletion",
    fetchedBeforeDelete.id,
    effectiveRestrictionId,
  );

  // 4. Soft-delete / deactivate the restriction for this admin user
  await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.erase(
    connection,
    {
      username,
      accountRestrictionId: effectiveRestrictionId,
    },
  );

  // 5. After deletion, GET must behave as not-found for this restriction
  await TestValidator.httpError(
    "soft-deleted admin restriction should not be retrievable",
    404,
    async () => {
      await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.at(
        connection,
        {
          username,
          accountRestrictionId: effectiveRestrictionId,
        },
      );
    },
  );
}
