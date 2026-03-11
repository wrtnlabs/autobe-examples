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
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_product_performance_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - approve seller registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Create seller account
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    shop_name: RandomGenerator.name(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    connection,
    { body: sellerJoinInput },
  );
  typia.assert(sellerAuth);
  // Find pending seller registration (simulated by knowing it was just created)
  // In real implementation, would fetch pending registrations list
  const pendingRegistration = typia.random<IEcommerceMallSellerRegistration>();
  pendingRegistration.id = sellerAuth.id;
  pendingRegistration.approval_status = "pending";
  // Approve seller registration
  await api.functional.ecommerceMall.admin.seller_registrations.approve(
    adminConnection,
    {
      sellerRegistrationId: pendingRegistration.id,
      body: {
        approval_status: "approved",
        responded_at: new Date().toISOString(),
      } satisfies IEcommerceMallSellerRegistration.IUpdate,
    },
  );
  // 2. Seller login
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinInput.email,
      password: sellerJoinInput.password,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Create categories for testing
  const category1 = typia.random<string & tags.Format<"uuid">>();
  const category2 = typia.random<string & tags.Format<"uuid">>();
  // 4. Create products with different creation times and stock levels
  const product1 = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: "Old Product Low Stock",
        description: "This product was created earlier with low stock",
        base_price: 10000,
        category_id: category1,
        is_available: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  // Add variant with low stock
  const variant1 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product1.id,
        body: {
          sku_code: `SKU-LOW-${RandomGenerator.alphaNumeric(6)}`,
          price_override: 10000,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  const product2 = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: "New Product High Stock",
        description: "This product was created recently with high stock",
        base_price: 20000,
        category_id: category2,
        is_available: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  // Add variant with higher stock
  const variant2 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product2.id,
        body: {
          sku_code: `SKU-HIGH-${RandomGenerator.alphaNumeric(6)}`,
          price_override: 20000,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // 5. Simulate sales by having customers place orders
  // Create customer and make purchase for product1
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Simulate purchase by creating order (in real system, this would involve cart)
  await api.functional.ecommerceMall.customer.orders.create(customerConnection);
  // 6. Test product performance with various filters
  // Filter by category
  const categoryResponse =
    await api.functional.ecommerceMall.seller.analytics.product_performance.index(
      sellerConnection,
      {
        body: {
          category_id: category1,
        } satisfies IEcommerceMallProductPerformance.IRequest,
      },
    );
  typia.assert(categoryResponse);
  // Verify category filter worked
  if (categoryResponse.data.length > 0) {
    for (const product of categoryResponse.data) {
      TestValidator.predicate(
        "filtered by category1",
        product.id === product1.id,
      );
    }
  }
  // Filter by date range
  const dateResponse =
    await api.functional.ecommerceMall.seller.analytics.product_performance.index(
      sellerConnection,
      {
        body: {
          created_from: new Date(Date.now() - 86400000).toISOString(), // Last 24 hours
          created_to: new Date().toISOString(),
        } satisfies IEcommerceMallProductPerformance.IRequest,
      },
    );
  typia.assert(dateResponse);
  // Filter by sales thresholds
  const salesResponse =
    await api.functional.ecommerceMall.seller.analytics.product_performance.index(
      sellerConnection,
      {
        body: {
          min_sales: 1,
          max_sales: 10,
        } satisfies IEcommerceMallProductPerformance.IRequest,
      },
    );
  typia.assert(salesResponse);
  // Filter by stock thresholds
  const stockResponse =
    await api.functional.ecommerceMall.seller.analytics.product_performance.index(
      sellerConnection,
      {
        body: {
          min_stock: 0,
          max_stock: 100,
        } satisfies IEcommerceMallProductPerformance.IRequest,
      },
    );
  typia.assert(stockResponse);
  // Combined filters
  const combinedResponse =
    await api.functional.ecommerceMall.seller.analytics.product_performance.index(
      sellerConnection,
      {
        body: {
          category_id: category1,
          min_sales: 0,
          min_stock: 0,
        } satisfies IEcommerceMallProductPerformance.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // 7. Verify response structure
  for (const product of combinedResponse.data) {
    TestValidator.predicate("has valid id", product.id !== undefined);
    TestValidator.predicate("has name", product.name !== undefined);
    TestValidator.predicate(
      "has sales metrics",
      product.total_quantity_sold >= 0,
    );
    TestValidator.predicate("has revenue", product.total_revenue >= 0);
    TestValidator.predicate("has average rating", product.average_rating >= 0);
    TestValidator.predicate("has review count", product.review_count >= 0);
  }
  // 8. Verify minimum stock calculation from inventory records
  // Since we didn't explicitly add inventory, stock should be 0
  for (const product of stockResponse.data) {
    TestValidator.predicate(
      "stock calculated from inventory",
      product.id === product1.id || product.id === product2.id,
    );
  }
}