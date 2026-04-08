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
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_super_admin_shipments_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_creation_with_tracking_info(
  connection: api.IConnection,
): Promise<void> {
  // 1. SuperAdmin authenticates
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: `superadmin-${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: "TestPassword123!",
      },
    });
  typia.assert(superAdmin);
  // 2. Admin authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: `admin-${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: "TestPassword123!",
        href: "https://test.com/admin",
        referrer: "https://test.com",
        ip: "127.0.0.1",
      },
    },
  );
  typia.assert(admin);
  // 3. Admin creates a category
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: `Test Category ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(category);
  // 4. Seller authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: `seller-${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: "TestPassword123!",
        href: "https://test.com/seller",
        referrer: "https://test.com",
        ip: "127.0.0.1",
      },
    },
  );
  typia.assert(seller);
  // 5. Seller creates a product in the category
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Test Product ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: category.id,
          basePrice: Math.floor(Math.random() * 100000) / 100 + 1,
        },
      },
    );
  typia.assert(product);
  // Get a product variant for cart creation
  const variant = product.variants[0];
  if (!variant) {
    throw new Error("Product has no variants");
  }
  // 6. Customer authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: `customer-${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: "TestPassword123!",
        href: "https://test.com/customer",
        referrer: "https://test.com",
        ip: "127.0.0.1",
      },
    });
  typia.assert(customer);
  // 7. Customer adds product variant to cart
  const cartItem: IEcommerceMallCartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: Math.floor(Math.random() * 10) + 1,
        },
      },
    );
  typia.assert(cartItem);
  // 8. Customer retrieves cart items
  const cartItems: IPageIEcommerceMallCartItem.ISummary =
    await api.functional.ecommerceMall.customer.cart_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(cartItems);
  // Verify cart has at least one item
  if (cartItems.data.length === 0) {
    throw new Error("No cart items found");
  }
  // 9. SuperAdmin creates a shipment with tracking information
  const shipment: IEcommerceMallShipment =
    await generate_random_ecommerce_mall_super_admin_shipments_create(
      superAdminConnection,
      {
        body: {
          orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
          carrierName: "FedEx",
          trackingNumber: `TRACK-${RandomGenerator.alphaNumeric(12)}`,
        },
      },
    );
  typia.assert(shipment);
  // 10. Validate shipment has tracking information
  TestValidator.equals(
    "shipment carrier_name matches input",
    shipment.carrier_name,
    "FedEx",
  );
  TestValidator.predicate(
    "shipment tracking_number is not empty",
    shipment.tracking_number.length > 0,
  );
  TestValidator.predicate(
    "shipment has shipment_items array",
    Array.isArray(shipment.shipment_items),
  );
  TestValidator.equals(
    "shipment status is in_transit",
    shipment.status,
    "in_transit",
  );
}
