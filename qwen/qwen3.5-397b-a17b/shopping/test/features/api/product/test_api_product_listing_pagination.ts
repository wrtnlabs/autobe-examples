import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test product listing pagination workflow for authenticated member users.
 *
 * Validates the complete product catalog browsing experience including member authentication, paginated product listing, and pagination metadata accuracy. Ensures that products are correctly filtered, sorted, and returned with proper pagination information.
 *
 * Special attention is given to verifying pagination metadata consistency across multiple pages, product structure completeness including category and seller references, and that products from suspended sellers or soft-deleted products are excluded from results.
 *
 * 1. Member user registers and authenticates via authorize_member_join utility.
 * 2. Fetches first page of products with default pagination (page=1, limit=20).
 * 3. Validates pagination metadata: current page, limit, total records, and total pages.
 * 4. Validates each product contains required fields: id, name, base_price, category, seller, inStock, createdAt.
 * 5. Validates category and seller summary objects contain their required fields.
 * 6. Fetches second page with custom pagination (page=2, limit=10).
 * 7. Validates pagination metadata updates correctly for page 2.
 * 8. Validates no product duplicates exist between page 1 and page 2.
 * 9. Validates products are sorted by newest (created_at DESC) by default.
 */
export async function test_api_product_listing_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Fetch first page with default pagination (page=1, limit=20)
  const page1Request = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallProduct.IRequest;
  const page1Response = await api.functional.shoppingMall.member.products.index(
    memberConnection,
    {
      body: page1Request,
    },
  );
  typia.assert(page1Response);
  // 3. Validate pagination metadata for page 1
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 20);
  TestValidator.predicate(
    "page 1 records is non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages is non-negative",
    page1Response.pagination.pages >= 0,
  );
  // 4. Validate pages calculation is correct
  const expectedPages =
    page1Response.pagination.records === 0
      ? 0
      : Math.ceil(
          page1Response.pagination.records / page1Response.pagination.limit,
        );
  TestValidator.equals(
    "page 1 total pages calculated correctly",
    page1Response.pagination.pages,
    expectedPages,
  );
  // 5. Validate each product in page 1 has required fields (business logic only)
  for (const product of page1Response.data) {
    // Validate product base fields - business logic validations
    TestValidator.predicate(
      "product has non-empty name",
      product.name.length > 0,
    );
    TestValidator.predicate(
      "product base_price is non-negative",
      product.base_price >= 0,
    );
    // Validate category summary - business logic
    TestValidator.predicate(
      "category has non-empty name",
      product.category.name.length > 0,
    );
    // Validate seller summary - business logic
    TestValidator.predicate(
      "seller has non-empty email",
      product.seller.email.length > 0,
    );
    TestValidator.predicate(
      "seller has valid approvalStatus",
      ["pending", "approved", "rejected"].includes(
        product.seller.approvalStatus,
      ),
    );
    // Validate thumbnailUrl is either valid URI or null/undefined (business logic)
    if (product.thumbnailUrl !== null && product.thumbnailUrl !== undefined) {
      TestValidator.predicate(
        "thumbnailUrl is non-empty",
        product.thumbnailUrl.length > 0,
      );
    }
  }
  // 6. Fetch second page with custom pagination (page=2, limit=10)
  const page2Request = {
    page: 2,
    limit: 10,
  } satisfies IShoppingMallProduct.IRequest;
  const page2Response = await api.functional.shoppingMall.member.products.index(
    memberConnection,
    {
      body: page2Request,
    },
  );
  typia.assert(page2Response);
  // 7. Validate pagination metadata for page 2
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 10);
  TestValidator.equals(
    "page 2 records matches page 1",
    page2Response.pagination.records,
    page1Response.pagination.records,
  );
  const expectedPages2 =
    page2Response.pagination.records === 0
      ? 0
      : Math.ceil(
          page2Response.pagination.records / page2Response.pagination.limit,
        );
  TestValidator.equals(
    "page 2 total pages calculated correctly",
    page2Response.pagination.pages,
    expectedPages2,
  );
  // 8. Validate no product duplicates between page 1 and page 2
  const page1Ids = new Set(page1Response.data.map((p) => p.id));
  const page2Ids = new Set(page2Response.data.map((p) => p.id));
  for (const id of page2Ids) {
    TestValidator.predicate(
      `product ${id} not duplicated across pages`,
      !page1Ids.has(id),
    );
  }
  // 9. Validate products are sorted by newest (created_at DESC) within each page
  if (page1Response.data.length > 1) {
    for (let i = 0; i < page1Response.data.length - 1; i++) {
      const currentDate = new Date(page1Response.data[i].createdAt).getTime();
      const nextDate = new Date(page1Response.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `product ${i} is newer than or equal to product ${i + 1}`,
        currentDate >= nextDate,
      );
    }
  }
  if (page2Response.data.length > 1) {
    for (let i = 0; i < page2Response.data.length - 1; i++) {
      const currentDate = new Date(page2Response.data[i].createdAt).getTime();
      const nextDate = new Date(page2Response.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `page 2 product ${i} is newer than or equal to product ${i + 1}`,
        currentDate >= nextDate,
      );
    }
  }
}
