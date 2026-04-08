import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_order_items_pagination_navigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create category (required for product creation)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        parentId: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 4. Create multiple products (prerequisite for order items)
  const products = await ArrayUtil.asyncRepeat(5, async () => {
    const product = await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: category.id,
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
    return product;
  });
  typia.assert(products);
  // 5. Test pagination with limit=5, page=1
  const page1Response = await api.functional.ecommerceMall.seller.items.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IEcommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(page1Response);
  // Verify pagination metadata for page 1
  TestValidator.equals(
    "page 1 current should be 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit should match request",
    page1Response.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "page 1 records should be non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages should be non-negative",
    page1Response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page 1 data length should not exceed limit",
    page1Response.data.length <= page1Response.pagination.limit,
  );
  const totalPages = page1Response.pagination.pages;
  const totalRecords = page1Response.pagination.records;
  // Navigate through multiple pages if available
  if (totalPages > 1) {
    const page2Response = await api.functional.ecommerceMall.seller.items.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
    typia.assert(page2Response);
    TestValidator.equals(
      "page 2 current should be 2",
      page2Response.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 records consistent with page 1",
      page2Response.pagination.records,
      totalRecords,
    );
    TestValidator.equals(
      "page 2 pages consistent with page 1",
      page2Response.pagination.pages,
      totalPages,
    );
  }
  // Test last page (boundary: last page may have fewer items)
  if (totalPages > 0) {
    const lastPageResponse =
      await api.functional.ecommerceMall.seller.items.index(sellerConnection, {
        body: {
          page: totalPages,
          limit: 5,
        } satisfies IEcommerceMallOrderItem.IRequest,
      });
    typia.assert(lastPageResponse);
    TestValidator.equals(
      "last page current matches total pages",
      lastPageResponse.pagination.current,
      totalPages,
    );
    TestValidator.predicate(
      "last page items within limit",
      lastPageResponse.data.length <= 5,
    );
    TestValidator.equals(
      "last page records consistent",
      lastPageResponse.pagination.records,
      totalRecords,
    );
  }
  // 6. Test boundary: page beyond available pages (should return empty data)
  const beyondPageNum = totalPages + 100;
  const beyondPageResponse =
    await api.functional.ecommerceMall.seller.items.index(sellerConnection, {
      body: {
        page: beyondPageNum,
        limit: 5,
      } satisfies IEcommerceMallOrderItem.IRequest,
    });
  typia.assert(beyondPageResponse);
  TestValidator.equals(
    "beyond page returns empty data array",
    beyondPageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page records still accurate",
    beyondPageResponse.pagination.records,
    totalRecords,
  );
  TestValidator.equals(
    "beyond page current reflects request",
    beyondPageResponse.pagination.current,
    beyondPageNum,
  );
  // 7. Test boundary: limit at minimum value (1)
  const minLimitResponse =
    await api.functional.ecommerceMall.seller.items.index(sellerConnection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies IEcommerceMallOrderItem.IRequest,
    });
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "min limit pagination limit should be 1",
    minLimitResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "min limit data length should be 0 or 1",
    minLimitResponse.data.length <= 1,
  );
  // 8. Test boundary: limit at maximum value (100)
  const maxLimitResponse =
    await api.functional.ecommerceMall.seller.items.index(sellerConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEcommerceMallOrderItem.IRequest,
    });
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit pagination limit should be 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit data length should not exceed 100",
    maxLimitResponse.data.length <= 100,
  );
  // 9. Verify total records count remains consistent across different requests
  if (totalPages >= 3) {
    const middlePage = Math.ceil(totalPages / 2);
    const middleResponse =
      await api.functional.ecommerceMall.seller.items.index(sellerConnection, {
        body: {
          page: middlePage,
          limit: 5,
        } satisfies IEcommerceMallOrderItem.IRequest,
      });
    typia.assert(middleResponse);
    TestValidator.equals(
      "middle page records match total",
      middleResponse.pagination.records,
      totalRecords,
    );
    TestValidator.equals(
      "middle page pages match total",
      middleResponse.pagination.pages,
      totalPages,
    );
  }
}
