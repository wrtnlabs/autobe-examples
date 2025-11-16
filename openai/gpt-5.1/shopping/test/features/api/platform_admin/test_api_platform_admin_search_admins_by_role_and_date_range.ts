import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformadmin";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate role-based and creation-date-range filtering when searching platform
 * admins.
 *
 * Business context: Platform administrators need to search other admins using
 * composite filters, especially primary role (role_key) and account creation
 * time windows. The PATCH /shoppingMall/platformAdmin/platformAdmins endpoint
 * accepts an IShoppingMallPlatformAdmin.IRequest body with optional roleCode
 * and createdFrom/createdTo fields, and returns a paginated
 * IPageIShoppingMallPlatformadmin.ISummary listing.
 *
 * This e2e test verifies that:
 *
 * - RoleCode filters by the admin’s primary role (role_key in summary)
 * - CreatedFrom/createdTo constrain results by created_at timestamp
 * - The filters combine conjunctively (AND), so only admins matching both are
 *   returned
 * - Pagination metadata is internally consistent with the page size
 *
 * High-level flow:
 *
 * 1. Bootstrap an initial platform admin via POST /auth/platformAdmin/join — this
 *    call also sets the Authorization header in the shared connection.
 * 2. As this authenticated platform admin, create at least one brand using POST
 *    /shoppingMall/platformAdmin/brands to honor dependencies and exercise the
 *    platformAdmin context.
 * 3. Create additional platform admins by calling join() multiple times. Each call
 *    returns IShoppingMallPlatformAdmin.IAuthorized with createdAt; these
 *    accounts will appear in the platformAdmins index list. We cannot directly
 *    set their role, but we can later group results by role_key as exposed in
 *    summaries.
 * 4. Call the index() endpoint with a broad filter (no roleCode or dates) to get a
 *    snapshot of admins as IPageIShoppingMallPlatformadmin.ISummary. From this
 *    list:
 *
 *    - Pick one summary that has a defined role_key (the target role)
 *    - Record its created_at timestamp
 * 5. Build a narrow date window around that created_at (here we use an exact match
 *    window by setting createdFrom and createdTo to the same value). Prepare an
 *    IShoppingMallPlatformAdmin.IRequest body with:
 *
 *    - RoleCode = targetSummary.role_key
 *    - CreatedFrom and createdTo set to that timestamp
 *    - Limit = small fixed value (e.g., 10), page = 1
 * 6. Call index() again with this composite filter.
 * 7. Validate that:
 *
 *    - Response is structurally correct (typia.assert on the summary page DTO).
 *    - Pagination.records equals data.length.
 *    - If records > 0, then pages === Math.ceil(records / limit).
 *    - Every item in data satisfies: item.role_key === roleCode (when roleCode is
 *         defined) createdFrom <= item.created_at <= createdTo (ISO date-time
 *         strings)
 * 8. Additionally, run a negative case using a very old date window where no
 *    admins should exist, and assert that the result has:
 *
 *    - Data.length === 0
 *    - Pagination.records === 0
 *    - Pagination.pages === 0
 */
export async function test_api_platform_admin_search_admins_by_role_and_date_range(
  connection: api.IConnection,
) {
  // 1. Bootstrap an initial platform admin via join to authenticate connection.
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const bootstrapAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(bootstrapAdmin);

  // 2. Create at least one brand to honor platformAdmin dependency usage.
  const brandBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Create additional platform admins to populate search space.
  const additionalAdmins: IShoppingMallPlatformAdmin.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const extraJoinBody = {
      email: `${RandomGenerator.alphabets(8)}${i}@example.com`,
      name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(12),
      ip: null,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallPlatformAdminJoin.IRequest;

    const admin: IShoppingMallPlatformAdmin.IAuthorized =
      await api.functional.auth.platformAdmin.join(connection, {
        body: extraJoinBody,
      });
    typia.assert(admin);
    additionalAdmins.push(admin);
  }

  // 4. Get a broad snapshot of platform admins via index with minimal filters.
  const broadRequestBody = {
    // Let page default to backend convention; explicitly set limit small.
    limit: 50 as number & tags.Type<"int32">,
  } satisfies IShoppingMallPlatformAdmin.IRequest;

  const broadPage: IPageIShoppingMallPlatformadmin.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.index(
      connection,
      { body: broadRequestBody },
    );
  typia.assert(broadPage);

  // Ensure there is at least one admin in the listing.
  TestValidator.predicate(
    "there should be at least one platform admin in broad search",
    broadPage.pagination.records > 0,
  );

  const summaries = broadPage.data;
  const targetWithRole = summaries.find((s) => s.role_key !== undefined);

  const targetSummary =
    targetWithRole !== undefined ? targetWithRole : summaries[0];

  const roleCode: string | undefined = targetSummary.role_key;

  // Narrow date window: exact timestamp match using created_at.
  const createdCenter = targetSummary.created_at;
  const createdFrom = createdCenter;
  const createdTo = createdCenter;

  const limit: number & tags.Type<"int32"> = 10 as number & tags.Type<"int32">;

  const filterBody: IShoppingMallPlatformAdmin.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit,
    roleCode,
    createdFrom,
    createdTo,
  };

  const filteredPage: IPageIShoppingMallPlatformadmin.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.index(
      connection,
      { body: filterBody },
    );
  typia.assert(filteredPage);

  const pagination = filteredPage.pagination;
  const data = filteredPage.data;

  // 7-a. pagination.records should equal data.length.
  TestValidator.equals(
    "filtered pagination.records equals data length",
    data.length,
    pagination.records,
  );

  // 7-b. pages calculation consistency when there are records.
  if (pagination.records === 0) {
    TestValidator.equals(
      "when no records, pages should be 0",
      0,
      pagination.pages,
    );
  } else {
    const expectedPages = Math.ceil(pagination.records / limit);
    TestValidator.equals(
      "pages should equal ceil(records / limit)",
      expectedPages,
      pagination.pages,
    );
  }

  // 7-c. Validate each item against the composite filter.
  for (const item of data) {
    // roleCode filter only applies when roleCode is defined.
    if (roleCode !== undefined) {
      TestValidator.equals(
        "item.role_key must equal requested roleCode when roleCode is provided",
        roleCode,
        item.role_key,
      );
    }

    TestValidator.predicate(
      "item.created_at must be >= createdFrom",
      item.created_at >= createdFrom,
    );
    TestValidator.predicate(
      "item.created_at must be <= createdTo",
      item.created_at <= createdTo,
    );
  }

  // 8. Negative case: pick a date far in the past where no admins should exist.
  const negativeFrom = "2000-01-01T00:00:00.000Z" as string &
    tags.Format<"date-time">;
  const negativeTo = "2000-01-01T00:00:00.000Z" as string &
    tags.Format<"date-time">;

  const negativeBody: IShoppingMallPlatformAdmin.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit,
    createdFrom: negativeFrom,
    createdTo: negativeTo,
    roleCode,
  };

  const negativePage: IPageIShoppingMallPlatformadmin.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.index(
      connection,
      { body: negativeBody },
    );
  typia.assert(negativePage);

  TestValidator.equals(
    "negative case should return zero records",
    0,
    negativePage.pagination.records,
  );
  TestValidator.equals(
    "negative case should return zero pages",
    0,
    negativePage.pagination.pages,
  );
  TestValidator.equals(
    "negative case should have empty data array",
    0,
    negativePage.data.length,
  );
}
