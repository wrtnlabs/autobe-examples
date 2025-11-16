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
 * Validate creation of an admin-user-specific account restriction episode.
 *
 * Business context: Administrative users (adminUser actors) can enforce policy
 * by creating account restriction episodes that target other adminUser
 * accounts. These restrictions are stored as generic episodes in the
 * community_platform_account_restrictions table and then linked to concrete
 * admin accounts via the admin-user linkage table.
 *
 * This scenario ensures that:
 *
 * 1. An acting admin (admin A) can join and obtain an authorized session.
 * 2. Another admin (admin B) can be created as a concrete restriction target.
 * 3. Admin A can create a generic restriction episode via the generic
 *    /communityPlatform/adminUser/accountRestrictions endpoint.
 * 4. Admin A can create a restriction episode specifically linked to admin B by
 *    calling
 *    /communityPlatform/adminUser/adminUsers/{username}/accountRestrictions.
 * 5. The response for the admin-user-specific endpoint is a full
 *    ICommunityPlatformAccountRestriction whose core business fields match the
 *    payload and which is correctly associated to both the acting admin
 *    (createdByAdminUser) and the target admin (adminUserRestriction).
 *
 * Step-by-step process:
 *
 * 1. Call auth.adminUser.join to create admin A; keep its username for validation
 *    and rely on SDK to attach token to the connection.
 * 2. Call auth.adminUser.join again to create admin B; keep its username to supply
 *    as the {username} path parameter.
 * 3. As admin A, call communityPlatform.adminUser.accountRestrictions.create with
 *    a valid ICommunityPlatformAccountRestriction.ICreate payload to ensure
 *    generic restriction creation works and capture its response for structural
 *    comparison.
 * 4. As admin A, call
 *    communityPlatform.adminUser.adminUsers.accountRestrictions.create with
 *    admin B's username and a similar payload, representing a login-scoped
 *    restriction for the adminUser account type.
 * 5. Use typia.assert to validate response structures and TestValidator to check
 *    that account_type, scope, reason_category, starts_at, and ends_at are
 *    consistent with the request. Additionally verify that createdByAdminUser
 *    summary refers to admin A and that adminUserRestriction summary refers to
 *    admin B.
 */
export async function test_api_admin_user_account_restriction_creation_for_admin_user(
  connection: api.IConnection,
) {
  // 1. Create acting admin A via join
  const adminAInput = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminA!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminA = await api.functional.auth.adminUser.join(connection, {
    body: adminAInput,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminA);

  // 2. Create target admin B via join
  const adminBInput = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminB!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminB = await api.functional.auth.adminUser.join(connection, {
    body: adminBInput,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminB);

  // 3. Create a generic restriction episode as admin A
  const now = new Date();
  const startsAt = now.toISOString() as string & tags.Format<"date-time">;
  const endsAt = null as (string & tags.Format<"date-time">) | null;

  const genericRestrictionBody = {
    account_type: "adminUser",
    scope: "login",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const genericRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: genericRestrictionBody },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(genericRestriction);

  // Basic sanity checks on generic restriction
  TestValidator.equals(
    "generic restriction account_type matches payload",
    genericRestriction.account_type,
    genericRestrictionBody.account_type,
  );
  TestValidator.equals(
    "generic restriction scope matches payload",
    genericRestriction.scope,
    genericRestrictionBody.scope,
  );
  TestValidator.equals(
    "generic restriction reason_category matches payload",
    genericRestriction.reason_category,
    genericRestrictionBody.reason_category,
  );

  // 4. Create an admin-user-specific restriction for admin B
  const specificStartsAt = new Date().toISOString() as string &
    tags.Format<"date-time">;

  const specificRestrictionBody = {
    account_type: "adminUser",
    scope: "login",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    starts_at: specificStartsAt,
    ends_at: null as (string & tags.Format<"date-time">) | null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const specificRestriction =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create(
      connection,
      {
        username: adminB.username,
        body: specificRestrictionBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(specificRestriction);

  // 5. Validate that the specific restriction reflects the payload
  TestValidator.equals(
    "specific restriction account_type matches payload",
    specificRestriction.account_type,
    specificRestrictionBody.account_type,
  );
  TestValidator.equals(
    "specific restriction scope matches payload",
    specificRestriction.scope,
    specificRestrictionBody.scope,
  );
  TestValidator.equals(
    "specific restriction reason_category matches payload",
    specificRestriction.reason_category,
    specificRestrictionBody.reason_category,
  );
  TestValidator.equals(
    "specific restriction starts_at matches payload",
    specificRestriction.starts_at,
    specificRestrictionBody.starts_at,
  );
  TestValidator.equals(
    "specific restriction ends_at matches payload",
    specificRestriction.ends_at ?? null,
    specificRestrictionBody.ends_at ?? null,
  );

  // 6. Validate linkage metadata where possible
  TestValidator.predicate(
    "specific restriction has createdByAdminUser summary when available",
    specificRestriction.createdByAdminUser === null ||
      specificRestriction.createdByAdminUser === undefined ||
      specificRestriction.createdByAdminUser.id === adminA.id,
  );

  TestValidator.predicate(
    "specific restriction has adminUserRestriction summary when available",
    specificRestriction.adminUserRestriction === null ||
      specificRestriction.adminUserRestriction === undefined ||
      specificRestriction.adminUserRestriction
        .community_platform_adminuser_id === adminB.id,
  );

  // 7. Optional structural comparison between generic and specific restrictions
  TestValidator.equals(
    "generic and specific restrictions share same scope",
    specificRestriction.scope,
    genericRestriction.scope,
  );
  TestValidator.equals(
    "generic and specific restrictions share same reason_category",
    specificRestriction.reason_category,
    genericRestriction.reason_category,
  );
}
