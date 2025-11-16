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

export async function test_api_admin_account_restriction_get_by_owner_admin(
  connection: api.IConnection,
) {
  // 1. Create acting adminUser via join
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const actingAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(actingAdmin);

  // 2. Create a generic restriction episode (not yet linked to a specific adminUser)
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour

  const genericRestrictionBody = {
    account_type: "adminUser",
    scope: "login",
    reason_category: "security",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const genericRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: genericRestrictionBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(genericRestriction);

  // 3. Create and link an adminUser-scoped restriction for the acting adminUser
  const linkedRestrictionBody = {
    account_type: "adminUser",
    scope: "login",
    reason_category: "security",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const linkedRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create(
      connection,
      {
        username: actingAdmin.username,
        body: linkedRestrictionBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(linkedRestriction);

  // 4. GET the restriction by username and accountRestrictionId
  const fetchedRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.at(
      connection,
      {
        username: actingAdmin.username,
        accountRestrictionId: linkedRestriction.id,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(fetchedRestriction);

  // 5. Basic identity and field equality checks
  TestValidator.equals(
    "fetched restriction id matches created linked restriction id",
    fetchedRestriction.id,
    linkedRestriction.id,
  );

  TestValidator.equals(
    "account_type is preserved and is adminUser",
    fetchedRestriction.account_type,
    "adminUser",
  );

  TestValidator.equals(
    "scope is preserved and is login",
    fetchedRestriction.scope,
    "login",
  );

  TestValidator.equals(
    "reason_category is preserved and is security",
    fetchedRestriction.reason_category,
    "security",
  );

  // 6. Linkage-semantic checks: member vs admin user restriction
  TestValidator.predicate(
    "memberUserRestriction is null or undefined for adminUser restriction",
    fetchedRestriction.memberUserRestriction === null ||
      fetchedRestriction.memberUserRestriction === undefined,
  );

  TestValidator.predicate(
    "adminUserRestriction is non-null for adminUser restriction",
    fetchedRestriction.adminUserRestriction !== null &&
      fetchedRestriction.adminUserRestriction !== undefined,
  );

  if (
    fetchedRestriction.adminUserRestriction !== null &&
    fetchedRestriction.adminUserRestriction !== undefined
  ) {
    const adminLink = fetchedRestriction.adminUserRestriction;

    TestValidator.equals(
      "linked adminUserRestriction references the created restriction id",
      adminLink.community_platform_account_restriction_id,
      fetchedRestriction.id,
    );

    TestValidator.equals(
      "linked adminUserRestriction references acting admin user's id",
      adminLink.community_platform_adminuser_id,
      actingAdmin.id,
    );

    if (adminLink.adminUser !== null && adminLink.adminUser !== undefined) {
      TestValidator.equals(
        "adminUser summary inside adminUserRestriction has same id as acting admin",
        adminLink.adminUser.id,
        actingAdmin.id,
      );
    }
  }

  // 7. Verify createdByAdminUser attribution
  TestValidator.predicate(
    "createdByAdminUser is populated for restriction created by acting admin",
    fetchedRestriction.createdByAdminUser !== null &&
      fetchedRestriction.createdByAdminUser !== undefined,
  );

  if (
    fetchedRestriction.createdByAdminUser !== null &&
    fetchedRestriction.createdByAdminUser !== undefined
  ) {
    TestValidator.equals(
      "createdByAdminUser id matches acting admin id",
      fetchedRestriction.createdByAdminUser.id,
      actingAdmin.id,
    );
  }

  // 8. Temporal semantics: starts_at <= ends_at and now within window
  const startsAtDate = new Date(fetchedRestriction.starts_at);
  const endsAtDate =
    fetchedRestriction.ends_at !== null &&
    fetchedRestriction.ends_at !== undefined
      ? new Date(fetchedRestriction.ends_at)
      : null;

  if (endsAtDate !== null) {
    TestValidator.predicate(
      "starts_at must be before or equal to ends_at",
      startsAtDate.getTime() <= endsAtDate.getTime(),
    );

    const nowCheck = new Date();
    TestValidator.predicate(
      "restriction window covers now (active or pending semantics)",
      startsAtDate.getTime() <= nowCheck.getTime() &&
        nowCheck.getTime() <= endsAtDate.getTime(),
    );
  }
}
