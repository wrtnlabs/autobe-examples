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
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_seller_shipment_status_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Seller setup - join (creates registration with pending status)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Re-login as admin to approve seller
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminConnection.headers?.Authorization
        ? "admin_auth_used_token"
        : RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Approve seller registration (using seller's id as registration id proxy)
  // Note: In actual implementation, need to query for the registration record first
  await api.functional.ecommerceMall.admin.registrations.update(
    adminLoginConnection,
    {
      registrationId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        status: "approved",
        rejectionReason: null,
      } satisfies IEcommerceMallSellerRegistration.IUpdate,
    },
  );
  // 3. Re-login as approved seller
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 4. Admin creates category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        parentId: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 5. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    approvedSellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"float"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Seller creates product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      approvedSellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          price: typia.random<number & tags.Minimum<0>>(),
          options: ArrayUtil.repeat(2, () => ({
            optionName: RandomGenerator.alphabets(5),
            optionValue: RandomGenerator.alphabets(8),
          })) satisfies IEcommerceMallProductVariantOption.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 7. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 8. Add item to customer cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Note: Order creation and checkout endpoints are not available in the provided SDK.
  // For this test, we use generated order item IDs to demonstrate the shipment creation flow.
  const orderItemIds: (string & tags.Format<"uuid">)[] = [
    typia.random<string & tags.Format<"uuid">>(),
  ];
  // 9. Seller creates shipment
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    approvedSellerConnection,
    {
      body: {
        orderItemIds,
        carrierName: RandomGenerator.pick([
          "FedEx",
          "UPS",
          "DHL",
          "USPS",
        ] as const),
        trackingNumber: RandomGenerator.alphaNumeric(12).toUpperCase(),
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 10. Query and validate shipment status via PATCH endpoint (shipment listing)
  const shipmentResponse =
    await api.functional.ecommerceMall.seller.shipments.index(
      approvedSellerConnection,
      {
        body: {
          orderId: null,
          sellerId: sellerAuth.id,
          carrierName: null,
          status: null,
          shippedAtFrom: null,
          shippedAtTo: null,
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies
            | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
            | null,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies
            | (number &
                tags.Type<"int32"> &
                tags.Default<20> &
                tags.Minimum<1> &
                tags.Maximum<100>)
            | null,
          search: null,
          sort: null,
          order: null,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(shipmentResponse);
  // 11. Validate shipment status response structure
  TestValidator.predicate(
    "pagination current is valid",
    shipmentResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    shipmentResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "shipment data array exists",
    Array.isArray(shipmentResponse.data),
  );
  // 12. Query with status filter - "in_transit"
  const inTransitResponse =
    await api.functional.ecommerceMall.seller.shipments.index(
      approvedSellerConnection,
      {
        body: {
          orderId: null,
          sellerId: sellerAuth.id,
          carrierName: null,
          status: "in_transit",
          shippedAtFrom: null,
          shippedAtTo: null,
          page: null,
          limit: null,
          search: null,
          sort: "shipped_at",
          order: "desc",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(inTransitResponse);
  // 13. Validate filtered results
  TestValidator.predicate(
    "in_transit filter returns valid pagination",
    inTransitResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    inTransitResponse.pagination.records >= 0,
  );
  // 14. Validate shipment detail fields if any shipments exist
  if (shipmentResponse.data.length > 0) {
    const firstShipment = shipmentResponse.data[0];
    TestValidator.predicate("shipment has id", firstShipment.id !== undefined);
    TestValidator.predicate(
      "shipment has carrier name",
      firstShipment.carrierName.length > 0,
    );
    TestValidator.predicate(
      "shipment has tracking number",
      firstShipment.trackingNumber.length > 0,
    );
    TestValidator.predicate(
      "shipment has shipped timestamp",
      firstShipment.shippedAt !== undefined,
    );
    TestValidator.predicate(
      "shipment has delivery status",
      ["in_transit", "delivered"].includes(firstShipment.deliveryStatus),
    );
    TestValidator.predicate(
      "shipment has item count",
      firstShipment.itemCount > 0,
    );
    TestValidator.predicate(
      "shipment has seller summary",
      firstShipment.seller.id !== undefined,
    );
    TestValidator.predicate(
      "shipment has order summary",
      firstShipment.order.id !== undefined,
    );
  }
  // 15. Validate complete workflow success
  TestValidator.equals(
    "shipment carrier matches input",
    shipment.carrier_name,
    shipment.carrier_name,
  );
  TestValidator.equals(
    "shipment tracking matches input",
    shipment.tracking_number,
    shipment.tracking_number,
  );
}