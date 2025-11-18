import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductTag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

export async function test_api_admin_search_product_tags_by_created_date_range(
  connection: api.IConnection,
) {
  /**
   * Scenario: admin searches product tags by created_at range.
   *
   * Steps:
   *
   * 1. Join as an admin (POST /auth/admin/join) to obtain authorized context.
   * 2. Create an "early" batch of tags (Set A) via POST
   *    /shoppingMall/admin/productTags.
   * 3. Capture a middle timestamp after Set A creation.
   * 4. Create a "late" batch of tags (Set B) via POST
   *    /shoppingMall/admin/productTags.
   * 5. Call PATCH /shoppingMall/admin/productTags with created_from set to the
   *    middle timestamp and created_to null, page and page_size large enough to
   *    include all tags. Expect only Set B to be returned.
   * 6. Optionally, call PATCH again with created_to set to the middle timestamp
   *    and created_from null, expecting only Set A to be returned.
   * 7. Validate that created_at range filtering is inclusive and coherent with
   *    pagination.
   */

  // 1. Join as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create early batch of tags (Set A)
  const earlyTags: IShoppingMallProductTag[] = [];
  const earlyCount: number = 3;

  for (let i = 0; i < earlyCount; i++) {
    const body = {
      code: `early-${RandomGenerator.alphaNumeric(8)}`,
      label: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 4 }),
      isActive: true,
    } satisfies IShoppingMallProductTag.ICreate;

    const created: IShoppingMallProductTag =
      await api.functional.shoppingMall.admin.productTags.create(connection, {
        body,
      });
    typia.assert(created);
    earlyTags.push(created);
  }

  // Ensure earlyTags is not empty
  TestValidator.predicate(
    "early tags must be created",
    earlyTags.length === earlyCount,
  );

  // 3. Capture middle timestamp (strictly after Set A creation)
  // Use a small delay to ensure DB timestamps are ordered, then take now() as middle
  await new Promise((resolve) => setTimeout(resolve, 10));
  const middleTimestamp: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // 4. Create late batch of tags (Set B)
  const lateTags: IShoppingMallProductTag[] = [];
  const lateCount: number = 3;

  for (let i = 0; i < lateCount; i++) {
    const body = {
      code: `late-${RandomGenerator.alphaNumeric(8)}`,
      label: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 4 }),
      isActive: true,
    } satisfies IShoppingMallProductTag.ICreate;

    const created: IShoppingMallProductTag =
      await api.functional.shoppingMall.admin.productTags.create(connection, {
        body,
      });
    typia.assert(created);
    lateTags.push(created);
  }

  TestValidator.predicate(
    "late tags must be created",
    lateTags.length === lateCount,
  );

  // Sanity check that late tags are actually created after the middle timestamp
  // (this might not be guaranteed if DB clock resolution is coarse, but we at
  // least assert that created_at strings are >= middleTimestamp when possible).
  for (const tag of lateTags) {
    TestValidator.predicate(
      "late tag created_at must be >= middleTimestamp",
      tag.created_at >= middleTimestamp,
    );
  }

  // 5. Search with created_from = middleTimestamp, created_to = null.
  // Expect only Set B.
  const forwardSearchBody = {
    search: null,
    created_from: middleTimestamp,
    created_to: null,
    updated_from: null,
    updated_to: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "asc",
  } satisfies IShoppingMallProductTag.IRequest;

  const forwardPage: IPageIShoppingMallProductTag.ISummary =
    await api.functional.shoppingMall.admin.productTags.index(connection, {
      body: forwardSearchBody,
    });
  typia.assert(forwardPage);

  // Validate pagination metadata
  TestValidator.predicate(
    "forward search page current must be 1",
    forwardPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "forward search page_size (limit) must be >= lateCount",
    forwardPage.pagination.limit >= lateCount,
  );

  // All returned tags must belong to lateTags and satisfy created_at >= middleTimestamp
  const forwardIds = forwardPage.data.map((t) => t.id);
  const expectedLateIds = lateTags.map((t) => t.id);

  for (const summary of forwardPage.data) {
    TestValidator.predicate(
      "forward result tag must be from late batch",
      expectedLateIds.includes(summary.id),
    );
  }

  // Ensure each late tag is present in the search results
  for (const late of lateTags) {
    TestValidator.predicate(
      "each late tag must appear in forward search results",
      forwardIds.includes(late.id),
    );
  }

  // Ensure no early tag is present
  const earlyIds = earlyTags.map((t) => t.id);
  for (const summary of forwardPage.data) {
    TestValidator.predicate(
      "no early tag must appear in forward search results",
      !earlyIds.includes(summary.id),
    );
  }

  // 6. Complementary search: created_to = middleTimestamp, created_from = null.
  const backwardSearchBody = {
    search: null,
    created_from: null,
    created_to: middleTimestamp,
    updated_from: null,
    updated_to: null,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "asc",
  } satisfies IShoppingMallProductTag.IRequest;

  const backwardPage: IPageIShoppingMallProductTag.ISummary =
    await api.functional.shoppingMall.admin.productTags.index(connection, {
      body: backwardSearchBody,
    });
  typia.assert(backwardPage);

  TestValidator.predicate(
    "backward search page current must be 1",
    backwardPage.pagination.current === 1,
  );

  const backwardIds = backwardPage.data.map((t) => t.id);
  const expectedEarlyIds = earlyTags.map((t) => t.id);

  for (const summary of backwardPage.data) {
    TestValidator.predicate(
      "backward result tag must be from early batch or earlier",
      expectedEarlyIds.includes(summary.id),
    );
  }

  for (const early of earlyTags) {
    TestValidator.predicate(
      "each early tag must appear in backward search results",
      backwardIds.includes(early.id),
    );
  }

  // Ensure no late tag is present in backward results
  for (const summary of backwardPage.data) {
    TestValidator.predicate(
      "no late tag must appear in backward search results",
      !expectedLateIds.includes(summary.id),
    );
  }
}
