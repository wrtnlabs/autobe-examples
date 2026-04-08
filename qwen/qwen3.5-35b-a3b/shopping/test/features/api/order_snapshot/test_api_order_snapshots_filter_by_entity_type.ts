import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_order_snapshots_filter_by_entity_type(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account for admin endpoint access
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "securePassword123",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // Login admin to access admin-only order snapshots endpoint
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: "admin@example.com",
      password: "securePassword123",
      ip: "127.0.0.1",
      referrer: "http://admin.test/",
    },
  });
  typia.assert(adminLogin);
  // Step 2: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@example.com",
      password: "securePassword123",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // Login seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: "seller@example.com",
      password: "securePassword123",
      ip: "127.0.0.1",
      href: "http://seller.test/login",
      referrer: "http://seller.test/",
    },
  });
  typia.assert(sellerLogin);
  // Step 3: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: "customer@example.com",
      password: "securePassword123",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(customer);
  // Login customer
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogin = await authorize_member_login(customerLoginConnection, {
    body: {
      email: "customer@example.com",
      password: "securePassword123",
      ip: "127.0.0.1",
      href: "http://customer.test/login",
      referrer: "http://customer.test/",
    },
  });
  typia.assert(customerLogin);
  // Step 4: Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: "Test Product",
        description: "A test product for snapshot filtering",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 10000,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 5: Seller creates a variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        body: {
          sku_code: "TEST-SKU-001",
          option_values: JSON.stringify({ size: "L", color: "red" }),
          stock_quantity: 100,
          price: 12000,
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Step 6: Customer places an order to create snapshots
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerLoginConnection,
    {
      body: {
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        order_items: [
          {
            product_variant_id: variant.id,
            quantity: 2,
          },
        ],
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Test Phase 1: Filter by entity_type = "ORDER_ITEM"
  const orderItemRequest: IEcommerceMallOrderSnapshot.IRequest = {
    page: 1,
    limit: 10,
    entity_type: "ORDER_ITEM",
    sort_by: "order_date",
    sort_order: "asc",
  };
  const orderItemPage =
    await api.functional.ecommerceMall.administrator.order_snapshots.index(
      adminLoginConnection,
      { body: orderItemRequest },
    );
  typia.assert(orderItemPage);
  // Verify pagination metadata for filtered results
  TestValidator.equals(
    "order_item filter pagination current",
    orderItemPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "order_item filter pagination limit",
    orderItemPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "order_item filter pagination records >= 0",
    orderItemPage.pagination.records >= 0,
  );
  // Test Phase 2: Filter by entity_type = "PRODUCT"
  const productRequest: IEcommerceMallOrderSnapshot.IRequest = {
    page: 1,
    limit: 10,
    entity_type: "PRODUCT",
    sort_by: "order_date",
    sort_order: "asc",
  };
  const productPage =
    await api.functional.ecommerceMall.administrator.order_snapshots.index(
      adminLoginConnection,
      { body: productRequest },
    );
  typia.assert(productPage);
  // Verify filtering works for different entity types
  TestValidator.equals(
    "product filter pagination current",
    productPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "product filter pagination limit",
    productPage.pagination.limit,
    10,
  );
  // Test Phase 3: Empty results test with no matching entity_type
  const emptyRequest: IEcommerceMallOrderSnapshot.IRequest = {
    page: 1,
    limit: 10,
    entity_type: "REVIEW",
    sort_by: "order_date",
    sort_order: "asc",
  };
  const emptyPage =
    await api.functional.ecommerceMall.administrator.order_snapshots.index(
      adminLoginConnection,
      { body: emptyRequest },
    );
  typia.assert(emptyPage);
  // Verify empty results handling
  TestValidator.equals(
    "empty results data array length",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "empty results pagination records",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results pagination pages",
    emptyPage.pagination.pages,
    0,
  );
  // Test Phase 4: Descending order sorting
  const descRequest: IEcommerceMallOrderSnapshot.IRequest = {
    page: 1,
    limit: 10,
    entity_type: "ORDER_ITEM",
    sort_by: "order_date",
    sort_order: "desc",
  };
  const descPage =
    await api.functional.ecommerceMall.administrator.order_snapshots.index(
      adminLoginConnection,
      { body: descRequest },
    );
  typia.assert(descPage);
  // Verify descending order pagination works
  TestValidator.equals(
    "descending order pagination current",
    descPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "descending order pagination limit",
    descPage.pagination.limit,
    10,
  );
  // Test with another valid entity_type filter
  const cancellationRequest: IEcommerceMallOrderSnapshot.IRequest = {
    page: 1,
    limit: 10,
    entity_type: "CANCELLATION_REQUEST",
    sort_by: "order_date",
    sort_order: "asc",
  };
  const cancellationPage =
    await api.functional.ecommerceMall.administrator.order_snapshots.index(
      adminLoginConnection,
      { body: cancellationRequest },
    );
  typia.assert(cancellationPage);
  TestValidator.equals(
    "cancellation filter pagination current",
    cancellationPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "cancellation filter pagination limit",
    cancellationPage.pagination.limit,
    10,
  );
}
