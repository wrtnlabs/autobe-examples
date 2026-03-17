import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test the auto-adjust quantities feature that reduces cart item quantities to match available stock.
 *
 * **Scenario Setup:**
 * 1. Authenticate as a seller and create a product with a variant
 * 2. Add limited inventory to the variant (e.g., 5 units)
 * 3. Authenticate as a customer
 * 4. Add the product variant to cart with quantity EXCEEDING available stock (e.g., cart has 10, stock is only 5)
 * 5. Call cart validation with `autoAdjustQuantities: true`
 * 6. Verify the cart quantity is reduced to available stock
 *
 * **Expected Behavior:**
 * - Initial validation without auto-adjust: `isValid: false`, `isAvailable: true`, warning about insufficient stock
 * - After auto-adjust: Cart item quantity should be reduced to match `availableQuantity`
 * - Re-validation should show `isValid: true`
 * - Response should reflect updated quantities
 *
 * **Business Rules Validated:**
 * - Stock availability warnings for quantity exceeding stock
 * - Auto-adjust feature allows customers to proceed with available quantity
 * - Quantity modifications honor stock constraints
 */
export async function test_api_cart_validate_auto_adjust_quantities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller and create product with variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<
          number & tags.Minimum<100> & tags.Maximum<10000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          options: [
            {
              optionName: "Color",
              optionValue: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
                "Black",
              ]),
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
          price: typia.random<
            number & tags.Minimum<100> & tags.Maximum<10000>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Add limited inventory (5 units)
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 5,
          reason: "Initial stock",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  TestValidator.equals(
    "initial inventory quantity",
    inventoryRecord.quantityChange,
    5,
  );
  // 2. Setup customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Add variant to cart with quantity exceeding stock (10 units when only 5 available)
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 10,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  TestValidator.equals("cart item initial quantity", cartItem.quantity, 10);
  // 4. Validate cart WITHOUT auto-adjust - should be invalid due to insufficient stock
  const validationWithoutAdjust: IEcommerceMallCartItem.IValidationResult =
    await api.functional.ecommerceMall.customer.cart.validate(
      customerConnection,
      {
        body: {
          autoAdjustQuantities: false,
        } satisfies IEcommerceMallCartItem.IValidate,
      },
    );
  typia.assert(validationWithoutAdjust);
  // Verify validation shows invalid due to insufficient stock
  TestValidator.equals(
    "validation without adjust - isValid",
    validationWithoutAdjust.isValid,
    false,
  );
  TestValidator.predicate(
    "has at least one item",
    validationWithoutAdjust.items.length > 0,
  );
  const validatedItem = validationWithoutAdjust.items[0];
  typia.assert(validatedItem);
  TestValidator.equals("item isAvailable", validatedItem.isAvailable, true);
  TestValidator.equals("item isValid", validatedItem.isValid, false);
  TestValidator.equals(
    "item availableQuantity",
    validatedItem.availableQuantity,
    5,
  );
  TestValidator.predicate("item has warning", validatedItem.warning !== null);
  TestValidator.predicate(
    "warning mentions insufficient stock",
    (validatedItem.warning?.toLowerCase().includes("stock") ?? false) ||
      (validatedItem.warning?.toLowerCase().includes("insufficient") ??
        false) ||
      (validatedItem.warning?.toLowerCase().includes("quantity") ?? false),
  );
  // 5. Validate cart WITH auto-adjust - should adjust quantity to available stock
  const validationWithAdjust: IEcommerceMallCartItem.IValidationResult =
    await api.functional.ecommerceMall.customer.cart.validate(
      customerConnection,
      {
        body: {
          autoAdjustQuantities: true,
        } satisfies IEcommerceMallCartItem.IValidate,
      },
    );
  typia.assert(validationWithAdjust);
  // Verify validation now passes
  TestValidator.equals(
    "validation with adjust - isValid",
    validationWithAdjust.isValid,
    true,
  );
  TestValidator.predicate(
    "has at least one item after adjust",
    validationWithAdjust.items.length > 0,
  );
  const adjustedItem = validationWithAdjust.items[0];
  typia.assert(adjustedItem);
  TestValidator.equals(
    "adjusted item isAvailable",
    adjustedItem.isAvailable,
    true,
  );
  TestValidator.equals("adjusted item isValid", adjustedItem.isValid, true);
  TestValidator.equals("adjusted item quantity", adjustedItem.quantity, 5);
  TestValidator.equals(
    "adjusted item availableQuantity",
    adjustedItem.availableQuantity,
    5,
  );
  TestValidator.equals("adjusted item warning", adjustedItem.warning, null);
  // 6. Verify cart item was actually updated by re-validating without auto-adjust
  const finalValidation: IEcommerceMallCartItem.IValidationResult =
    await api.functional.ecommerceMall.customer.cart.validate(
      customerConnection,
      {
        body: {
          autoAdjustQuantities: false,
        } satisfies IEcommerceMallCartItem.IValidate,
      },
    );
  typia.assert(finalValidation);
  // After auto-adjust, even without auto-adjust flag, should be valid
  TestValidator.equals(
    "final validation isValid",
    finalValidation.isValid,
    true,
  );
  const finalItem = finalValidation.items[0];
  typia.assert(finalItem);
  TestValidator.equals("final item quantity", finalItem.quantity, 5);
}
