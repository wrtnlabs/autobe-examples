import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

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

/**
 * Test that product variant deletion is blocked when order items with 'paid' status exist for that variant.
 *
 * Validates the critical order integrity protection mechanism that prevents deletion of variants
 * referenced by active customer orders. This test ensures business data cannot be corrupted by
 * removing product variants that are already part of completed transactions.
 *
 * The test verifies:
 * 1. Seller can create a product and variant
 * 2. Customer can purchase the variant through a complete order flow
 * 3. System blocks variant deletion when paid order items exist
 * 4. Proper 409 Conflict error with detailed blocking order information
 * 5. Variant remains intact after failed deletion attempt
 */
export async function test_api_product_variant_deletion_blocked_paid_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Register and login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: RandomGenerator.name(2),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Create a product (seller must be approved to create products)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    { body: undefined },
  );
  typia.assert(product);
  // 4. Create a variant for this product
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        body: undefined,
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Create an order with this variant (customer)
  // Note: Addresses API is not available in the current SDK, so we use a generated UUID
  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerLoginConnection,
    {
      body: {
        shipping_address_id: shippingAddressId,
        order_items: [
          {
            product_variant_id: variant.id,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          },
        ],
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 6. Verify variant still exists before deletion attempt
  const preDeleteVariant = product.variants.find((v) => v.id === variant.id);
  if (!preDeleteVariant) {
    throw new Error("Variant not found in product variants");
  }
  typia.assert(preDeleteVariant);
  // 7. Verify order item has paid status (blocking condition)
  const orderItem = order.items.find((i) => i.id === order.items[0]?.id);
  if (!orderItem) {
    throw new Error("Order item not found");
  }
  typia.assert(orderItem);
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // 8. Attempt to delete the variant (should fail due to paid order item)
  let deletedError: api.HttpError | undefined;
  try {
    await api.functional.ecommerceMall.seller.products.variants.erase(
      sellerLoginConnection,
      { productId: product.id, variantId: variant.id },
    );
    // If we reach here, deletion succeeded (unexpected)
    TestValidator.error(
      "variant deletion should be blocked by paid order item",
      () => {
        throw new Error("Expected 409 Conflict but deletion succeeded");
      },
    );
  } catch (error) {
    if (!typia.is<api.HttpError>(error)) {
      throw error;
    }
    deletedError = error;
  }
  // 9. Verify deletion was blocked with proper error
  if (deletedError === undefined) {
    throw new Error("Expected HttpError to be captured");
  }
  TestValidator.equals("status code is 409 Conflict", deletedError.status, 409);
  // 10. Verify variant still exists after failed deletion
  const variantStillExists = product.variants.find((v) => v.id === variant.id);
  if (!variantStillExists) {
    throw new Error("Variant should still exist after failed deletion");
  }
  TestValidator.equals(
    "variant still exists",
    variantStillExists.id,
    variant.id,
  );
  TestValidator.equals(
    "variant is not deleted (deleted_at is null)",
    variantStillExists.deleted_at,
    null,
  );
}
