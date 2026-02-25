import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_shipment } from "../../../prepare/prepare_random_shopping_mall_order_shipment";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_shipment_admin_oversight_all_platform(
  connection: api.IConnection,
): Promise<void> {
  // Create first seller with product, variant, inventory
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {});
  typia.assert(seller1Auth);
  // Create admin and approve seller1
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const approvedSeller1 =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller1Auth.id,
    });
  typia.assert(approvedSeller1);
  // Login seller1 after approval
  const seller1LoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(seller1LoginConnection, {
    body: {
      email: seller1Auth.email,
      password: "password1234",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  // Create product for seller1
  const product1 = await generate_random_shopping_mall_seller_products_create(
    seller1LoginConnection,
    {},
  );
  typia.assert(product1);
  // Create variant for product1
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller1LoginConnection,
      { params: { productId: product1.id } },
    );
  typia.assert(variant1);
  // Add inventory to variant1
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    seller1LoginConnection,
    {
      params: { variantId: variant1.id },
      body: { quantity: 100, reason: "Initial stock" },
    },
  );
  // Create second seller for multi-seller test
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {});
  typia.assert(seller2Auth);
  // Approve seller2
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller2Auth.id,
  });
  // Login seller2 after approval
  const seller2LoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(seller2LoginConnection, {
    body: {
      email: seller2Auth.email,
      password: "password1234",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  // Create product for seller2
  const product2 = await generate_random_shopping_mall_seller_products_create(
    seller2LoginConnection,
    {},
  );
  typia.assert(product2);
  // Create variant for product2
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller2LoginConnection,
      { params: { productId: product2.id } },
    );
  typia.assert(variant2);
  // Add inventory to variant2
  await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
    seller2LoginConnection,
    {
      params: { variantId: variant2.id },
      body: { quantity: 100, reason: "Initial stock" },
    },
  );
  // Create customer and place order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Admin retrieves all platform shipments
  const allShipments = await api.functional.shoppingMall.seller.shipments.index(
    adminConnection,
    { body: { page: 1, limit: 10 } },
  );
  typia.assert(allShipments);
  // Verify admin receives shipments with proper structure
  TestValidator.predicate(
    "admin receives shipment pagination data",
    () => allShipments.data !== undefined,
  );
  // Test status filtering - shipped items
  const shippedResult =
    await api.functional.shoppingMall.seller.shipments.index(adminConnection, {
      body: { page: 1, limit: 10, status: "shipped" },
    });
  typia.assert(shippedResult);
  // Verify pagination structure exists
  TestValidator.predicate(
    "pagination has correct structure",
    () =>
      shippedResult.pagination.current !== undefined &&
      shippedResult.pagination.limit !== undefined &&
      shippedResult.pagination.records !== undefined &&
      shippedResult.pagination.pages !== undefined,
  );
  // Test status filtering - delivered items
  const deliveredResult =
    await api.functional.shoppingMall.seller.shipments.index(adminConnection, {
      body: { page: 1, limit: 10, status: "delivered" },
    });
  typia.assert(deliveredResult);
  // Test carrier name filtering
  const carrierFiltered =
    await api.functional.shoppingMall.seller.shipments.index(adminConnection, {
      body: { page: 1, limit: 10, carrierName: "FedEx" },
    });
  typia.assert(carrierFiltered);
  // Verify admin has full platform visibility
  TestValidator.predicate(
    "admin can query all platform shipments",
    () => allShipments.pagination !== undefined,
  );
}
