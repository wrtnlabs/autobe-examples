import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductPerformance";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductPerformance";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_product_performance_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerRegistration =
    await api.functional.ecommerceMall.auth.seller.join(sellerConnection, {
      body: {
        email: typia.random<
          string & tags.MinLength<1> & tags.Format<"email">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(3),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(sellerRegistration);
  // 2. Create a category using placeholder data (no category creation API available)
  // Use typia.random for the full ISummary structure
  const category = typia.random<IEcommerceMallCategory.ISummary>();
  // 3. Seller login after registration
  const sellerLoggedInConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.seller.login(
    sellerLoggedInConnection,
    {
      body: {
        email: sellerRegistration.email,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  // 4. Create 15 products for pagination testing
  const products: IEcommerceMallProduct[] = [];
  for (let i = 0; i < 15; i++) {
    const product = await api.functional.ecommerceMall.seller.products.create(
      sellerLoggedInConnection,
      {
        body: {
          name: `Product ${i + 1} for performance test`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >() satisfies number as number,
          is_available: true,
          category_id: category.id,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
    typia.assert(product);
    products.push(product);
  }
  // 5. Create order items to generate performance metrics
  const customerConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.customer.join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(2),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Create orders for some products to generate sales data
  for (let i = 0; i < 10; i++) {
    const order =
      await api.functional.ecommerceMall.customer.orders.create(
        customerConnection,
      );
    typia.assert(order);
  }
  // 6. Test pagination with page=1, limit=2
  const page1Response =
    await api.functional.ecommerceMall.seller.analytics.product_performance.index(
      sellerLoggedInConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallProductPerformance.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 should have 2 products",
    page1Response.data.length,
    2,
  );
  TestValidator.equals(
    "page 1 current should be 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit should be 2",
    page1Response.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "page 1 records should be at least 15",
    page1Response.pagination.records >= 15,
  );
  TestValidator.predicate(
    "page 1 pages should be at least 8",
    page1Response.pagination.pages >= 8,
  );
  // 7. Test pagination with page=2, limit=2
  const page2Response =
    await api.functional.ecommerceMall.seller.analytics.product_performance.index(
      sellerLoggedInConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IEcommerceMallProductPerformance.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 should have 2 products",
    page2Response.data.length,
    2,
  );
  TestValidator.equals(
    "page 2 current should be 2",
    page2Response.pagination.current,
    2,
  );
  // 8. Verify different products returned on different pages
  const page1Ids = page1Response.data.map((p) => p.id);
  const page2Ids = page2Response.data.map((p) => p.id);
  const hasDifferentProducts = page1Ids.some((id) => !page2Ids.includes(id));
  TestValidator.predicate(
    "different products on different pages",
    hasDifferentProducts,
  );
  // 9. Test with maximum limit (100)
  const maxLimitResponse =
    await api.functional.ecommerceMall.seller.analytics.product_performance.index(
      sellerLoggedInConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallProductPerformance.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit should be 100",
    maxLimitResponse.pagination.limit,
    100,
  );
}
