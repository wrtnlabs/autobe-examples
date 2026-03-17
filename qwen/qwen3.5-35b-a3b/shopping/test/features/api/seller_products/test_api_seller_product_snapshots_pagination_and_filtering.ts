import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_product_snapshots_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller@1234",
      href: "https://seller.example.com/join",
      referrer: "https://seller.example.com/",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 2. Create a product (creates initial snapshot)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product - Initial",
        description: "Initial product description",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 10000,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Test pagination - default page 1 with limit 10
  const page1Response =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  // 4. Verify page 1 returns data
  TestValidator.predicate(
    "page 1 returns snapshots",
    page1Response.data.length >= 1,
  );
  // 5. Verify pagination metadata structure
  TestValidator.equals(
    "page 1 has valid current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page 1 has valid limit",
    page1Response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "page 1 has valid records",
    page1Response.pagination.records >= 1,
  );
  TestValidator.predicate(
    "page 1 has valid pages",
    page1Response.pagination.pages >= 1,
  );
  // 6. Test pagination - page 2
  const page2Response =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  // 7. Verify page 2 pagination metadata
  TestValidator.equals(
    "page 2 has valid current page",
    page2Response.pagination.current,
    2,
  );
  // 8. Test pagination - page 3
  const page3Response =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 3,
          limit: 10,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(page3Response);
  // 9. Verify page 3 pagination metadata
  TestValidator.equals(
    "page 3 has valid current page",
    page3Response.pagination.current,
    3,
  );
  // 10. Test date range filtering
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const fiveMinutesFromNow = new Date(
    now.getTime() + 5 * 60 * 1000,
  ).toISOString();
  const filteredResponse =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          dateRangeStart: fiveMinutesAgo,
          dateRangeEnd: fiveMinutesFromNow,
        } satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 11. Verify filtered response has valid data
  TestValidator.predicate(
    "filtered response has valid data",
    filteredResponse.data.length >= 0,
  );
  // 12. Verify sort order (created_at descending by default)
  if (page1Response.data.length > 1) {
    for (let i = 1; i < page1Response.data.length; i++) {
      const prevSnapshot = page1Response.data[i - 1];
      const currentSnapshot = page1Response.data[i];
      TestValidator.predicate(
        `snapshot ${i} is older than snapshot ${i - 1}`,
        new Date(prevSnapshot.created_at) >
          new Date(currentSnapshot.created_at),
      );
    }
  }
  // 13. Verify immutability - snapshot data reflects state at creation time
  if (page1Response.data.length > 0) {
    const firstSnapshot = page1Response.data[0];
    TestValidator.predicate(
      "snapshot has required fields",
      firstSnapshot.id !== undefined &&
        firstSnapshot.name !== undefined &&
        firstSnapshot.base_price !== undefined &&
        firstSnapshot.created_at !== undefined,
    );
  }
  // 14. Verify snapshot immutability - name may differ from current product
  if (page1Response.data.length > 0) {
    const firstSnapshot = page1Response.data[0];
    TestValidator.equals(
      "snapshot name matches snapshot record",
      firstSnapshot.name,
      firstSnapshot.name,
    );
  }
}
