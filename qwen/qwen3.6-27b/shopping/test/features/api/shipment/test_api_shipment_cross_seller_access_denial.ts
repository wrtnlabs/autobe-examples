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
 * Test that sellers cannot update shipments belonging to other sellers, validating cross-seller ownership isolation.
 *
 * Validates that the shipment update endpoint enforces seller ownership by rejecting attempts from sellers who do not own the target shipment. This ensures that sellers cannot modify, track, or tamper with shipments created by other sellers, maintaining strict cross-seller data isolation.
 *
 * The test exercises the complete order lifecycle: admin approval of sellers, product creation with variants and inventory, customer order placement, and shipment creation by the owning seller. The cross-seller access denial is then validated by having a non-owning seller attempt to update the shipment.
 *
 * 1. Administrator joins, logs in, and creates a product category.
 * 2. First seller joins and logs in.
 * 3. Second seller joins and logs in.
 * 4. Administrator approves both seller registration requests.
 * 5. First seller creates a product in the category, a product variant with options, and adds inventory stock.
 * 6. Customer joins, logs in, and creates a shipping address.
 * 7. Customer places an order containing the first seller's product variant.
 * 8. First seller creates a shipment for the order item.
 * 9. Second seller attempts to update the first seller's shipment.
 * 10. Validates that the update returns 403 Forbidden due to cross-seller ownership mismatch.
 */
export async function test_api_shipment_cross_seller_access_denial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and logs in
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_admin_join(adminJoinConnection, {
    body: { email: adminEmail, password: adminPassword },
  });
  typia.assert(adminJoinResponse);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // 2. Admin creates category
  const category =
    await api.functional.ecommercePlatform.admin.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommercePlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  // 3. Seller 1 joins and logs in
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Password = RandomGenerator.alphaNumeric(16);
  const seller1JoinConnection: api.IConnection = { host: connection.host };
  const seller1JoinResponse = await authorize_seller_join(
    seller1JoinConnection,
    {
      body: {
        email: seller1Email,
        password: seller1Password,
      },
    },
  );
  typia.assert(seller1JoinResponse);
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_login(seller1Connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 4. Seller 2 joins and logs in
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Password = RandomGenerator.alphaNumeric(16);
  const seller2JoinConnection: api.IConnection = { host: connection.host };
  const seller2JoinResponse = await authorize_seller_join(
    seller2JoinConnection,
    {
      body: {
        email: seller2Email,
        password: seller2Password,
      },
    },
  );
  typia.assert(seller2JoinResponse);
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_login(seller2Connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 5. Admin approves Seller 1
  const seller1Approval =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
      adminConnection,
      {
        requestId: seller1JoinResponse.id,
        body: {
          status: "approved",
          reason: null,
        } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(seller1Approval);
  // 6. Admin approves Seller 2
  const seller2Approval =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
      adminConnection,
      {
        requestId: seller2JoinResponse.id,
        body: {
          status: "approved",
          reason: null,
        } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(seller2Approval);
  // 7. Seller 1 creates product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      seller1Connection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 8. Seller 1 creates variant
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      seller1Connection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 9. Seller 1 adds inventory stock
  await generate_random_ecommerce_platform_seller_products_variants_inventory_create(
    seller1Connection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: {
        quantity_delta: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  // 10. Customer joins and logs in
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerJoinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    },
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IEcommercePlatformCustomer.ILogin,
  });
  // 11. Customer creates shipping address
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 12. Customer creates order with seller 1's variant
  const order = await api.functional.ecommercePlatform.customer.orders.create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        items: [
          {
            ecommerce_platform_product_variant_id: variant.id,
            quantity: 1,
            price: product.base_price,
          } satisfies IEcommercePlatformOrderItem.ICreate,
        ],
      } satisfies IEcommercePlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // 13. Seller 1 creates shipment for the order item
  const shipment =
    await generate_random_ecommerce_platform_seller_shipments_create(
      seller1Connection,
      {
        body: {
          orderItemIds: [order.items[0].id],
        },
      },
    );
  typia.assert(shipment);
  // 14. Seller 2 attempts to update Seller 1's shipment → 403 Forbidden
  await TestValidator.httpError(
    "cross-seller shipment update denied",
    403,
    async () => {
      return await api.functional.ecommercePlatform.seller.shipments.update(
        seller2Connection,
        {
          shipmentId: shipment.id,
          body: {} satisfies IEcommercePlatformShipment.IUpdate,
        },
      );
    },
  );
}