import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPolicyVersion";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

/**
 * Validate pagination and sorting for business policy versions listing.
 *
 * Business goal: Ensure that the PATCH
 * /shoppingMall/admin/businessPolicies/{policyCode}/versions search endpoint
 * correctly paginates and orders policy versions by effective_from in
 * descending order, and that navigation between pages is consistent and
 * non-overlapping.
 *
 * Steps:
 *
 * 1. Join an admin to obtain an authenticated connection.
 * 2. Create a dedicated business policy for this test.
 * 3. Create 25+ versions under that policy with increasing effective_from.
 * 4. Query page 1 (limit=10) ordered by effective_from desc and validate
 *    pagination and ordering.
 * 5. Query page 2 with same sort and verify it returns the next slice without
 *    overlap with page 1.
 * 6. Query page 3 and validate remaining records and total counts.
 */
export async function test_api_business_policy_versions_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Join an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a dedicated business policy
  const policyBody = {
    policy_code: `policy_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      { body: policyBody },
    );
  typia.assert(policy);

  // 3. Create 25 versions with strictly increasing effective_from
  const versions: IShoppingMallPolicyVersion[] = [];
  const baseDate = new Date();

  for (let i = 0; i < 25; i++) {
    const effectiveFrom = new Date(
      baseDate.getTime() + i * 60_000,
    ).toISOString();

    const versionBody = {
      version_code: `v${i + 1}`,
      title: `Version ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
      body_markdown: RandomGenerator.content({ paragraphs: 2 }),
      parameters_json: null,
      status: "active",
      effective_from: effectiveFrom,
      effective_until: null,
    } satisfies IShoppingMallPolicyVersion.ICreate;

    const created: IShoppingMallPolicyVersion =
      await api.functional.shoppingMall.admin.businessPolicies.versions.create(
        connection,
        {
          policyCode: policy.policy_code,
          body: versionBody,
        },
      );
    typia.assert(created);
    versions.push(created);
  }

  // Helper to assert descending order of effective_from
  const assertDescendingByEffectiveFrom = (
    title: string,
    items: IShoppingMallPolicyVersion.ISummary[],
  ): void => {
    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1].effective_from!;
      const curr = items[i].effective_from!;
      TestValidator.predicate(
        `${title} - effective_from[${i - 1}] >= effective_from[${i}]`,
        prev >= curr,
      );
    }
  };

  // Pre-compute the newest effective_from across created versions
  const sortedCreatedByEffectiveFromDesc = [...versions].sort((a, b) => {
    const ea = a.effective_from ?? "";
    const eb = b.effective_from ?? "";
    if (ea === eb) return 0;
    return ea > eb ? -1 : 1;
  });
  const newest = sortedCreatedByEffectiveFromDesc[0];

  // 4. Query page 1
  const page1Request = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    status: null,
    effective_from_gte: null,
    effective_from_lte: null,
    search: null,
    order_by: "effective_from",
    order_direction: "desc",
  } satisfies IShoppingMallPolicyVersion.IRequest;

  const page1: IPageIShoppingMallPolicyVersion.ISummary =
    await api.functional.shoppingMall.admin.businessPolicies.versions.index(
      connection,
      {
        policyCode: policy.policy_code,
        body: page1Request,
      },
    );
  typia.assert(page1);

  TestValidator.equals("page1.limit should be 10", page1.pagination.limit, 10);
  TestValidator.predicate(
    "page1.pagination.pages should be at least 3",
    page1.pagination.pages >= 3,
  );
  TestValidator.equals("page1 should contain 10 items", page1.data.length, 10);

  // Ensure effective_from is descending on page 1
  assertDescendingByEffectiveFrom("page1", page1.data);

  // Ensure newest version appears first
  const page1First = page1.data[0];
  TestValidator.equals(
    "newest version should appear first on page1",
    page1First.id,
    newest.id,
  );

  const lastEffectiveFromPage1 =
    page1.data[page1.data.length - 1].effective_from!;

  // 6. Query page 2
  const page2Request = {
    page: 2 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    status: null,
    effective_from_gte: null,
    effective_from_lte: null,
    search: null,
    order_by: "effective_from",
    order_direction: "desc",
  } satisfies IShoppingMallPolicyVersion.IRequest;

  const page2: IPageIShoppingMallPolicyVersion.ISummary =
    await api.functional.shoppingMall.admin.businessPolicies.versions.index(
      connection,
      {
        policyCode: policy.policy_code,
        body: page2Request,
      },
    );
  typia.assert(page2);

  TestValidator.equals("page2.limit should be 10", page2.pagination.limit, 10);
  TestValidator.equals("page2 should contain 10 items", page2.data.length, 10);

  assertDescendingByEffectiveFrom("page2", page2.data);

  // Ensure no overlap between page1 and page2 ids
  const page1Ids = new Set(page1.data.map((v) => v.id));
  for (const item of page2.data) {
    TestValidator.predicate(
      "page2 items should not overlap with page1 items",
      page1Ids.has(item.id) === false,
    );
  }

  // Ensure effective_from on page2 are <= last of page1
  for (const item of page2.data) {
    const ef = item.effective_from!;
    TestValidator.predicate(
      "page2.effective_from should be <= last effective_from of page1",
      ef <= lastEffectiveFromPage1,
    );
  }

  const lastEffectiveFromPage2 =
    page2.data[page2.data.length - 1].effective_from!;

  // 7. Query page 3
  const page3Request = {
    page: 3 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    status: null,
    effective_from_gte: null,
    effective_from_lte: null,
    search: null,
    order_by: "effective_from",
    order_direction: "desc",
  } satisfies IShoppingMallPolicyVersion.IRequest;

  const page3: IPageIShoppingMallPolicyVersion.ISummary =
    await api.functional.shoppingMall.admin.businessPolicies.versions.index(
      connection,
      {
        policyCode: policy.policy_code,
        body: page3Request,
      },
    );
  typia.assert(page3);

  TestValidator.predicate(
    "page3 should contain at least 5 items",
    page3.data.length >= 5,
  );
  TestValidator.predicate(
    "page3 should contain at most 10 items",
    page3.data.length <= 10,
  );

  assertDescendingByEffectiveFrom("page3", page3.data);

  // Total records should equal created count
  TestValidator.equals(
    "pagination.records should equal number of created versions",
    page1.pagination.records,
    versions.length,
  );

  // Ensure page3 versions are not overlapping with page1 and page2
  const previousIds = new Set([
    ...page1.data.map((v) => v.id),
    ...page2.data.map((v) => v.id),
  ]);
  for (const item of page3.data) {
    TestValidator.predicate(
      "page3 items should not overlap with page1 and page2 items",
      previousIds.has(item.id) === false,
    );
  }

  // Ensure effective_from on page3 are <= last of page2 (global ordering)
  for (const item of page3.data) {
    const ef = item.effective_from!;
    TestValidator.predicate(
      "page3.effective_from should be <= last effective_from of page2",
      ef <= lastEffectiveFromPage2,
    );
  }
}
