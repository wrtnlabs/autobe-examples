import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test pagination edge cases for admin seller order items listing.
 *
 * Scenario:
 * 1. Admin authenticates
 * 2. Seller creates account and products with variants
 * 3. Customer places multiple orders creating order items for the seller
 * 4. Admin queries order items with pagination (limit=1)
 * 5. Verify page 1 returns 1 record, page 2 returns 1 record, page 3 returns empty
 * 6. Verify pagination metadata (total records, total pages) is accurate
 * 7. Verify sort order is maintained across pages
 */
export async function test_api_order_item_admin_seller_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // Setup seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // Setup customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Seller creates two products with variants
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
      },
    );
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
      },
    );
  // Customer places first order
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: { productVariantId: variant1.id, quantity: 1 },
    },
  );
  await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  // Customer places second order
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: { productVariantId: variant2.id, quantity: 1 },
    },
  );
  await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  // Test pagination: Page 1 with limit 1
  const page1 =
    await api.functional.ecommerceMall.admin.sellers.orderItems.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          page: 1,
          limit: 1,
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(page1);
  // Test pagination: Page 2 with limit 1
  const page2 =
    await api.functional.ecommerceMall.admin.sellers.orderItems.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          page: 2,
          limit: 1,
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(page2);
  // Test pagination: Page 3 (beyond available data)
  const page3 =
    await api.functional.ecommerceMall.admin.sellers.orderItems.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          page: 3,
          limit: 1,
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(page3);
  // Validate pagination boundaries
  TestValidator.equals("page 1 returns exactly 1 record", page1.data.length, 1);
  TestValidator.equals("page 2 returns exactly 1 record", page2.data.length, 1);
  TestValidator.equals("page 3 returns empty array", page3.data.length, 0);
  // Validate pagination metadata
  TestValidator.equals("total records is 2", page1.pagination.records, 2);
  TestValidator.equals("total pages is 2", page1.pagination.pages, 2);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("limit is 1", page1.pagination.limit, 1);
  // Validate page 3 metadata still shows correct totals
  TestValidator.equals("page 3 total records", page3.pagination.records, 2);
  TestValidator.equals("page 3 total pages", page3.pagination.pages, 2);
  // Validate records are different across pages
  TestValidator.notEquals(
    "page 1 and page 2 have different items",
    page1.data[0].id,
    page2.data[0].id,
  );
}
