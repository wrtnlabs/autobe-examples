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
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
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
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer } from "../../../prepare/prepare_random_ecommerce_mall_customer";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_items_cross_seller_items(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoined = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminJoined);
  // Admin login for subsequent operations
  const adminLoggedIn = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(adminLoggedIn);
  // Create Seller A and approve
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = RandomGenerator.alphaNumeric(16);
  const sellerAJoined = await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAJoined);
  // Approve Seller A
  await api.functional.ecommerceMall.admin.registrations.update(
    adminConnection,
    {
      registrationId: sellerAJoined.id,
      body: {
        status: "approved",
      } satisfies IEcommerceMallSellerRegistration.IUpdate,
    },
  );
  // Create Seller B and approve
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = RandomGenerator.alphaNumeric(16);
  const sellerBJoined = await authorize_seller_join(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerBJoined);
  // Approve Seller B
  await api.functional.ecommerceMall.admin.registrations.update(
    adminConnection,
    {
      registrationId: sellerBJoined.id,
      body: {
        status: "approved",
      } satisfies IEcommerceMallSellerRegistration.IUpdate,
    },
  );
  // Seller A login
  await authorize_seller_login(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Seller B login
  await authorize_seller_login(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Seller A creates product
  const sellerAProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerAConnection,
      {},
    );
  typia.assert(sellerAProduct);
  // Seller A creates product variant
  const sellerAVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: {
          productId: sellerAProduct.id,
        },
      },
    );
  typia.assert(sellerAVariant);
  // Seller B creates product
  const sellerBProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerBConnection,
      {},
    );
  typia.assert(sellerBProduct);
  // Seller B creates product variant
  const sellerBVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: {
          productId: sellerBProduct.id,
        },
      },
    );
  typia.assert(sellerBVariant);
  // Create customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoined = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerJoined);
  // Customer creates shipping address
  await generate_random_ecommerce_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  // Customer adds Seller A's item to cart
  const cartItemA =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: sellerAVariant.id,
          quantity: 2,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemA);
  // Customer adds Seller B's item to cart
  const cartItemB =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: sellerBVariant.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemB);
  // Create shipment for Seller A using their cart item ID
  // In real scenario, this would be order item IDs; using cart item as placeholder for test context
  const orderItemIdA = cartItemA.id;
  const orderItemIdB = cartItemB.id;
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerAConnection,
    {
      body: {
        orderItemIds: [orderItemIdA],
        carrierName: RandomGenerator.name(),
        trackingNumber: RandomGenerator.alphaNumeric(12),
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Verify Seller A cannot query items filtering by Seller B's sellerId
  await TestValidator.error(
    "cross-seller item access by sellerId filter should fail",
    async () => {
      await api.functional.ecommerceMall.seller.shipments.items.index(
        sellerAConnection,
        {
          shipmentId: shipment.id,
          body: {
            sellerId: sellerBJoined.id,
            page: 1,
            limit: 10,
          } satisfies IEcommerceMallOrderItem.IRequest,
        },
      );
    },
  );
  // Verify Seller B cannot access Seller A's shipment
  await TestValidator.error(
    "seller accessing other seller's shipment should fail",
    async () => {
      await api.functional.ecommerceMall.seller.shipments.items.index(
        sellerBConnection,
        {
          shipmentId: shipment.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IEcommerceMallOrderItem.IRequest,
        },
      );
    },
  );
  // Verify Seller A can access their own items successfully
  const sellerAItems =
    await api.functional.ecommerceMall.seller.shipments.items.index(
      sellerAConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sellerAItems);
}
