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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAccountRestriction";

export async function test_api_admin_user_account_restrictions_listing_for_specific_admin(
  connection: api.IConnection,
) {
  // 1. Register acting admin A
  const adminAJoin = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminA: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoin,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminA);

  // 2. Create a generic account restriction episode (not linked to any admin)
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const genericRestrictionCreate = {
    account_type: "adminUser",
    scope: "login",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: now,
    ends_at: null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const genericRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: genericRestrictionCreate,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(genericRestriction);

  // 3. Register admin B who will be the target of admin-specific restriction
  const adminBJoin = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminB: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoin,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminB);

  // 4. Create and link a restriction episode specifically for admin B
  const activeStart: string & tags.Format<"date-time"> = new Date(
    Date.now() - 5 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">; // 5 minutes ago

  const adminBReasonSummary = RandomGenerator.paragraph({ sentences: 2 });

  const adminBRestrictionCreate = {
    account_type: "adminUser",
    scope: "posting",
    reason_category: "policy_violation",
    reason_detail: adminBReasonSummary,
    starts_at: activeStart,
    ends_at: null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const adminBRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create(
      connection,
      {
        username: adminB.username,
        body: adminBRestrictionCreate,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(adminBRestriction);

  // 5. List restrictions for admin B with active window covering now
  const effectiveFromGte: string & tags.Format<"date-time"> = new Date(
    Date.now() - 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">; // 1 hour ago
  const effectiveFromLte: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">; // 1 hour later

  const requestPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestLimit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const listRequest = {
    page: requestPage,
    limit: requestLimit,
    sort_by: "created_at",
    sort_direction: "desc" as const,
    subject_username: adminB.username,
    subject_type: "adminUser",
    restriction_type: null,
    is_active: true,
    effective_from_gte: effectiveFromGte,
    effective_from_lte: effectiveFromLte,
    effective_until_gte: null,
    effective_until_lte: null,
    reason_category: null,
    created_at_gte: null,
    created_at_lte: null,
  } satisfies ICommunityPlatformAccountRestriction.IRequest;

  const page: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.index(
      connection,
      {
        username: adminB.username,
        body: listRequest,
      },
    );
  typia.assert<IPageICommunityPlatformAccountRestriction.ISummary>(page);

  // 6. Assertions on pagination
  TestValidator.equals(
    "pagination current page should match request",
    page.pagination.current,
    requestPage,
  );
  TestValidator.equals(
    "pagination limit should match request",
    page.pagination.limit,
    requestLimit,
  );

  TestValidator.predicate(
    "data should contain at least one restriction",
    page.data.length > 0,
  );

  // Find the restriction that should correspond to adminBRestriction by id
  const matchedForAdminB = page.data.find(
    (item) => item.id === adminBRestriction.id,
  );

  TestValidator.predicate(
    "listing should include the admin-specific restriction for admin B",
    matchedForAdminB !== undefined,
  );

  if (matchedForAdminB !== undefined) {
    TestValidator.equals(
      "matched restriction should target adminUser account_type",
      matchedForAdminB.account_type,
      "adminUser",
    );

    TestValidator.equals(
      "matched restriction should have the same created_by_adminuser id as acting admin A",
      matchedForAdminB.created_by_adminuser.id,
      adminA.id,
    );
  }

  // Ensure the generic restriction is not included in B's listing
  const genericPresent = page.data.some(
    (item) => item.id === genericRestriction.id,
  );

  TestValidator.predicate(
    "generic unlinked restriction must not appear in admin B's listing",
    genericPresent === false,
  );
}
