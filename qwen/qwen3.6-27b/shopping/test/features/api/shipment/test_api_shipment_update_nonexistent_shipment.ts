import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import type { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { generate_random_ecommerce_platform_customer_orders_create } from "../../../generate/generate_random_ecommerce_platform_customer_orders_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_inventory_create";
import { generate_random_ecommerce_platform_seller_shipments_create } from "../../../generate/generate_random_ecommerce_platform_seller_shipments_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_inventory_record } from "../../../prepare/prepare_random_ecommerce_platform_inventory_record";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shipment } from "../../../prepare/prepare_random_ecommerce_platform_shipment";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test that the shipment update endpoint properly handles non-existent shipments.
 *
 * Validates that when a properly authenticated seller attempts to update a shipment
 * using a UUID that does not exist in the database, the system correctly returns
 * HTTP 404 Not Found. This test ensures that the endpoint properly validates
 * shipment existence before processing updates, preventing any data leakage about
 * existing shipments and confirming that valid authentication cannot circumvent the
 * non-existence check.
 *
 * The full ecommerce platform setup is required: admin creates a product category,
 * seller registers and receives admin approval, seller creates a product with
 * variants and inventory stock, a customer places an order, and a valid shipment
 * is created for context. The test then exercises the shipment update endpoint
 * with a fabricated UUID.
 *
 * 1. Administrator registers, logs in, and creates a product category.
 * 2. Seller registers and receives admin approval to enable full operations.
 * 3. Seller logs in with authenticated credentials.
 * 4. Customer registers, logs in, creates a shipping address, and places an order.
 * 5. Seller creates a product assigned to the category, adds a variant, and sets inventory stock.
 * 6. Seller creates a valid shipment for environmental context.
 * 7. Seller calls PUT on a fabricated shipment UUID that does not exist.
 * 8. Validate the response returns HTTP 404 Not Found status.
 */
export async function test_api_shipment_update_nonexistent_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@ecommerce.test",
      password: "admin1234",
      href: "https://ecommerce.test/admin/login",
      referrer: "https://ecommerce.test",
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  typia.assert(adminLogin);
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller joins and gets approved
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@ecommerce.test",
      password: "seller1234",
    },
  });
  typia.assert(sellerJoin);
  const approvalRequest =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
      adminConnection,
      {
        requestId: sellerJoin.id,
        body: {
          status: "approved",
          reason: null,
        } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvalRequest);
  // 3. Seller logs in (now approved)
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: "seller@ecommerce.test",
      password: "seller1234",
      href: "https://ecommerce.test/seller/login",
      referrer: "https://ecommerce.test",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 4. Customer joins, logs in, creates shipping address
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer1234",
    },
  });
  typia.assert(customerJoin);
  const customerEmail = customerJoin.email;
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: "customer1234",
    } satisfies IEcommercePlatformCustomer.ILogin,
  });
  typia.assert(customerLogin);
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 5. Product, variant, inventory setup
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {},
      },
    );
  typia.assert(variant);
  const inventoryRecord =
    await generate_random_ecommerce_platform_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          quantity_delta: 100,
        },
      },
    );
  typia.assert(inventoryRecord);
  // 6. Customer places order
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // 7. Create valid shipment for environment context
  const validShipment =
    await generate_random_ecommerce_platform_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: order.items.map((item) => item.id),
        },
      },
    );
  typia.assert(validShipment);
  // 8. Attempt to update non-existent shipment with fabricated UUID
  const nonExistentShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "updating non-existent shipment returns 404",
    404,
    async () =>
      await api.functional.ecommercePlatform.seller.shipments.update(
        sellerConnection,
        {
          shipmentId: nonExistentShipmentId,
          body: {} satisfies IEcommercePlatformShipment.IUpdate,
        },
      ),
  );
}
