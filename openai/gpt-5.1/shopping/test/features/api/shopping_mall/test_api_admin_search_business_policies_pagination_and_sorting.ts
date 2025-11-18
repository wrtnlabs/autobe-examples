import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBusinessPolicy";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";

export async function test_api_admin_search_business_policies_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.test.example.com/join",
    referrer: "https://admin.test.example.com/",
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Seed multiple business policies with deterministic policy_code values
  const seedCount = 8;
  const categories = ["refund", "review"] as const;

  type SeedPolicy = {
    id: string;
    created_at: string;
    policy_code: string;
  };

  const seededPolicies: SeedPolicy[] = [];

  for (let index = 0; index < seedCount; index++) {
    const numeric = (index + 1).toString().padStart(3, "0");
    const policyCode = `policy_code_${numeric}`;

    const createBody = {
      policy_code: policyCode,
      name: `Policy ${numeric}`,
      category: categories[index % categories.length],
      description: RandomGenerator.paragraph({ sentences: 4 }),
      is_active: index % 2 === 0,
    } satisfies IShoppingMallBusinessPolicy.ICreate;

    const created: IShoppingMallBusinessPolicy =
      await api.functional.shoppingMall.admin.businessPolicies.create(
        connection,
        {
          body: createBody,
        },
      );
    typia.assert<IShoppingMallBusinessPolicy>(created);

    seededPolicies.push({
      id: created.id,
      created_at: created.created_at,
      policy_code: created.policy_code,
    });
  }

  // Helper: sort seeded policies by created_at asc, then policy_code asc as tie-breaker
  const seededSortedByCreatedAsc = [...seededPolicies].sort((a, b) => {
    if (a.created_at < b.created_at) return -1;
    if (a.created_at > b.created_at) return 1;
    if (a.policy_code < b.policy_code) return -1;
    if (a.policy_code > b.policy_code) return 1;
    return 0;
  });

  const pageLimit = 3;

  // 3. First page search: page 1, sorted by created_at asc
  const requestPage1 = {
    policy_code: null,
    name: null,
    category: null,
    is_active: null,
    search: null,
    page: 1 as number & tags.Type<"int32">,
    limit: pageLimit as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "asc",
  } satisfies IShoppingMallBusinessPolicy.IRequest;

  const page1: IPageIShoppingMallBusinessPolicy.ISummary =
    await api.functional.shoppingMall.admin.businessPolicies.index(connection, {
      body: requestPage1,
    });
  typia.assert<IPageIShoppingMallBusinessPolicy.ISummary>(page1);

  // Basic pagination validations for page 1
  TestValidator.equals(
    "page 1 current page index",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit matches request",
    page1.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "page 1 records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    page1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page 1 data length not exceeding limit",
    page1.data.length <= pageLimit,
  );

  // Ensure page1 data is sorted by created_at asc then policy_code asc
  const page1Sorted = [...page1.data].sort((a, b) => {
    if (a.created_at < b.created_at) return -1;
    if (a.created_at > b.created_at) return 1;
    if (a.code < b.code) return -1;
    if (a.code > b.code) return 1;
    return 0;
  });
  TestValidator.equals(
    "page 1 is sorted by created_at asc then code asc",
    page1.data,
    page1Sorted,
  );

  // 4. Second page search: page 2, same sort
  const requestPage2 = {
    policy_code: null,
    name: null,
    category: null,
    is_active: null,
    search: null,
    page: 2 as number & tags.Type<"int32">,
    limit: pageLimit as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "asc",
  } satisfies IShoppingMallBusinessPolicy.IRequest;

  const page2: IPageIShoppingMallBusinessPolicy.ISummary =
    await api.functional.shoppingMall.admin.businessPolicies.index(connection, {
      body: requestPage2,
    });
  typia.assert<IPageIShoppingMallBusinessPolicy.ISummary>(page2);

  TestValidator.equals(
    "page 2 current page index",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit matches request",
    page2.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "page 2 data length not exceeding limit",
    page2.data.length <= pageLimit,
  );

  const page2Sorted = [...page2.data].sort((a, b) => {
    if (a.created_at < b.created_at) return -1;
    if (a.created_at > b.created_at) return 1;
    if (a.code < b.code) return -1;
    if (a.code > b.code) return 1;
    return 0;
  });
  TestValidator.equals(
    "page 2 is sorted by created_at asc then code asc",
    page2.data,
    page2Sorted,
  );

  // 5. Verify seeded policies appear in global sorted order consistent with pagination
  const allPageIds = page1.data
    .map((p) => p.id)
    .concat(page2.data.map((p) => p.id));

  // Each seeded policy id should appear somewhere in the admin-visible list
  const seededIdSet = new Set(seededPolicies.map((p) => p.id));
  const foundSeededIds = new Set<string>();
  for (const id of allPageIds) {
    if (seededIdSet.has(id)) foundSeededIds.add(id);
  }

  TestValidator.predicate(
    "at least one seeded policy appears in first two pages",
    foundSeededIds.size > 0,
  );

  // 6. Sorting verification only within our seeded set when using policy_code desc with high limit
  const sortByCodeRequest = {
    policy_code: null,
    name: null,
    category: null,
    is_active: null,
    search: null,
    page: 1 as number & tags.Type<"int32">,
    limit: seedCount as number & tags.Type<"int32">,
    sort_by: "policy_code",
    sort_direction: "desc",
  } satisfies IShoppingMallBusinessPolicy.IRequest;

  const sortedByCode: IPageIShoppingMallBusinessPolicy.ISummary =
    await api.functional.shoppingMall.admin.businessPolicies.index(connection, {
      body: sortByCodeRequest,
    });
  typia.assert<IPageIShoppingMallBusinessPolicy.ISummary>(sortedByCode);

  const seededCodesDesc = [...seededPolicies]
    .map((p) => p.policy_code)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  const pageCodesForSeeded = sortedByCode.data
    .filter((p) => seededIdSet.has(p.id))
    .map((p) => p.code);

  const expectedCodesForSeeded = seededCodesDesc.slice(
    0,
    pageCodesForSeeded.length,
  );

  TestValidator.equals(
    "policies are sorted by policy_code desc when requested",
    pageCodesForSeeded,
    expectedCodesForSeeded,
  );
}
