import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { generate_random_shopping_mall_member_carts_create } from "../../../generate/generate_random_shopping_mall_member_carts_create";
import { generate_random_shopping_mall_member_carts_items_create } from "../../../generate/generate_random_shopping_mall_member_carts_items_create";
import { generate_random_shopping_mall_member_inventory_records_create } from "../../../generate/generate_random_shopping_mall_member_inventory_records_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_payments_create } from "../../../generate/generate_random_shopping_mall_member_payments_create";
import { generate_random_shopping_mall_member_product_variants_create } from "../../../generate/generate_random_shopping_mall_member_product_variants_create";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_payment } from "../../../prepare/prepare_random_shopping_mall_payment";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_order_force_cancel_single_item_isolated_stock_and_snapshot_integrity(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(10)}@test.local`,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_member_join(sellerConnection, {
    body: {
      email: `seller_${RandomGenerator.alphabets(10)}@test.local`,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(seller);
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const product =
    await generate_random_shopping_mall_member_products_create_product(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: categoryId,
          code: `P-${RandomGenerator.alphabets(8)}`,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_featured: true,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const variantA =
    await generate_random_shopping_mall_member_product_variants_create(
      sellerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          code: `V-A-${RandomGenerator.alphabets(6)}`,
          title: `Variant ${RandomGenerator.alphabets(6)}`,
          option_value: `Option-${RandomGenerator.alphabets(6)}`,
          price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variantA);
  const variantB =
    await generate_random_shopping_mall_member_product_variants_create(
      sellerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          code: `V-B-${RandomGenerator.alphabets(6)}`,
          title: `Variant ${RandomGenerator.alphabets(6)}`,
          option_value: `Option-${RandomGenerator.alphabets(6)}`,
          price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variantB);
  await generate_random_shopping_mall_member_inventory_records_create(
    sellerConnection,
    {
      body: {
        shopping_mall_product_variant_id: variantA.id,
        stock_quantity: 20,
        reserved_quantity: 0,
        available_quantity: 20,
      } satisfies IShoppingMallInventoryRecord.ICreate,
    },
  );
  await generate_random_shopping_mall_member_inventory_records_create(
    sellerConnection,
    {
      body: {
        shopping_mall_product_variant_id: variantB.id,
        stock_quantity: 20,
        reserved_quantity: 0,
        available_quantity: 20,
      } satisfies IShoppingMallInventoryRecord.ICreate,
    },
  );
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: `customer_${RandomGenerator.alphabets(10)}@test.local`,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customer);
  const address = await generate_random_shopping_mall_member_addresses_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        postal_code: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<9999999>>()}`,
        country: "US",
        city: RandomGenerator.alphabets(6),
        street_line1: `Street ${RandomGenerator.alphabets(6)}`,
        street_line2: null,
        is_default: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  const cart = await generate_random_shopping_mall_member_carts_create(
    customerConnection,
    {},
  );
  typia.assert(cart);
  const cartItemA =
    await generate_random_shopping_mall_member_carts_items_create(
      customerConnection,
      {
        params: { cartId: cart.id },
        body: {
          shoppingMallProductVariantId: variantA.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemA);
  const cartItemB =
    await generate_random_shopping_mall_member_carts_items_create(
      customerConnection,
      {
        params: { cartId: cart.id },
        body: {
          shoppingMallProductVariantId: variantB.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItemB);
  const payment = await generate_random_shopping_mall_member_payments_create(
    customerConnection,
    {
      body: {
        amount: (cartItemA.subtotalAmount +
          cartItemB.subtotalAmount) satisfies number,
        currency: "USD",
        provider: "test_provider",
        provider_reference: `ref_${RandomGenerator.alphabets(16)}`,
        orderPlacementContextId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallPayment.ICreate,
    },
  );
  typia.assert(payment);
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_payment_id: payment.id,
        ship_to_name: address.recipientName,
        ship_to_phone: address.phoneNumber,
        ship_to_postal_code: address.postalCode,
        ship_to_region: address.city,
        ship_to_city: address.city,
        ship_to_street_address: address.streetLine1,
        ship_to_detail_address: address.streetLine2 ?? "",
        shipping_instructions: null,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  const orderItemA = order.orderItems.find(
    (oi) => oi.shopping_mall_product_variant_id === variantA.id,
  );
  const orderItemB = order.orderItems.find(
    (oi) => oi.shopping_mall_product_variant_id === variantB.id,
  );
  if (!orderItemA || !orderItemB) {
    throw new Error("Missing expected order items for variants A and B");
  }
  // IShoppingMallOrder.IUpdate in provided DTO only includes shipping fields.
  // Admin oversight PATCH consumes this DTO type as request body.
  const patchBody1 = {
    ship_to_name: `Canceled-${RandomGenerator.alphabets(6)}`,
    ship_to_phone: RandomGenerator.mobile(),
    shipping_instructions: null,
  } satisfies IShoppingMallOrder.IUpdate;
  const patched1 =
    await api.functional.shoppingMall.admin.admin.orders.processAdminOrderOversight(
      adminConnection,
      {
        body: patchBody1,
      },
    );
  typia.assert(patched1);
  const patched2 =
    await api.functional.shoppingMall.admin.admin.orders.processAdminOrderOversight(
      adminConnection,
      {
        body: patchBody1,
      },
    );
  typia.assert(patched2);
  TestValidator.equals(
    "overall status idempotent",
    patched2.overallStatus,
    patched1.overallStatus,
  );
}
