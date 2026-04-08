import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_cart_retrieval_with_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 2. Register a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 3. Register a superAdmin to approve seller
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 4. Seller creates a product with variants and inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  // Create first variant
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-V1-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
      },
    );
  // Create second variant
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-V2-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
        },
      },
    );
  // Set inventory for both variants
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant1.id },
      body: { quantity: 10, operationType: "restock", reason: "Initial stock" },
    },
  );
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant2.id },
      body: { quantity: 5, operationType: "restock", reason: "Initial stock" },
    },
  );
  // 5. Customer adds multiple different product variants to cart
  // Add first variant with quantity 2
  const cart1 =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: { productVariantId: variant1.id, quantity: 2 },
      },
    );
  typia.assert(cart1);
  // Add second variant with quantity 3
  const cart2 =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: { productVariantId: variant2.id, quantity: 3 },
      },
    );
  typia.assert(cart2);
  // 6. Customer adds same variant twice to verify quantity combination
  // Add variant1 again with quantity 1 - should combine with existing quantity of 2
  const cart3 =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: { productVariantId: variant1.id, quantity: 1 },
      },
    );
  typia.assert(cart3);
  // 7. Retrieve cart via GET /ecommerceMall/customer/cart
  const cart =
    await api.functional.ecommerceMall.customer.cart.at(customerConnection);
  typia.assert(cart);
  // Validation: Cart should have 2 line items (variant1 combined, variant2 separate)
  TestValidator.equals("cart should have 2 line items", cart.items.length, 2);
  // Validation: Find the items by variant ID
  const variant1Item = cart.items.find(
    (item) => (item as any).variant?.id === variant1.id,
  );
  const variant2Item = cart.items.find(
    (item) => (item as any).variant?.id === variant2.id,
  );
  TestValidator.predicate(
    "variant1 should be in cart",
    variant1Item !== undefined,
  );
  TestValidator.predicate(
    "variant2 should be in cart",
    variant2Item !== undefined,
  );
  // Validation: Same variant should have combined quantity (2 + 1 = 3)
  TestValidator.equals(
    "variant1 quantity should be combined (2+1)",
    variant1Item!.quantity,
    3,
  );
  // Validation: variant2 quantity should be 3
  TestValidator.equals(
    "variant2 quantity should be 3",
    variant2Item!.quantity,
    3,
  );
  // Validation: availabilityStatus should be 'available' for both
  TestValidator.equals(
    "variant1 availabilityStatus",
    variant1Item!.availabilityStatus,
    "available",
  );
  TestValidator.equals(
    "variant2 availabilityStatus",
    variant2Item!.availabilityStatus,
    "available",
  );
  // Validation: Each item should have subtotal
  const variant1Price = variant1.price ?? product.basePrice;
  const variant2Price = variant2.price ?? product.basePrice;
  TestValidator.equals(
    "variant1 subtotal",
    (variant1Item! as any).subtotal,
    variant1Price * 3,
  );
  TestValidator.equals(
    "variant2 subtotal",
    (variant2Item! as any).subtotal,
    variant2Price * 3,
  );
  // Validation: Cart total should be sum of all subtotals
  const expectedTotal = variant1Price * 3 + variant2Price * 3;
  TestValidator.equals("cartTotal calculation", cart.cartTotal, expectedTotal);
  // Validation: Each variant should have sku_code
  TestValidator.equals(
    "variant1 sku_code",
    (variant1Item! as any).variant?.sku_code,
    variant1.skuCode,
  );
  TestValidator.equals(
    "variant2 sku_code",
    (variant2Item! as any).variant?.sku_code,
    variant2.skuCode,
  );
  // Validation: Each variant should have optionValues array
  TestValidator.predicate(
    "variant1 should have optionValues",
    (variant1Item! as any).variant?.optionValues?.length > 0,
  );
  TestValidator.predicate(
    "variant2 should have optionValues",
    (variant2Item! as any).variant?.optionValues?.length > 0,
  );
  // Validation: Each variant should have product summary with id, name, basePrice, shopName
  TestValidator.equals(
    "variant1 product id",
    (variant1Item! as any).variant?.product?.id,
    product.id,
  );
  TestValidator.equals(
    "variant1 product name",
    (variant1Item! as any).variant?.product?.name,
    product.name,
  );
  TestValidator.equals(
    "variant1 product basePrice",
    (variant1Item! as any).variant?.product?.basePrice,
    product.basePrice,
  );
  TestValidator.equals(
    "variant1 product shopName",
    (variant1Item! as any).variant?.product?.shopName,
    (product.seller as any).name,
  );
  TestValidator.equals(
    "variant2 product id",
    (variant2Item! as any).variant?.product?.id,
    product.id,
  );
  TestValidator.equals(
    "variant2 product name",
    (variant2Item! as any).variant?.product?.name,
    product.name,
  );
  TestValidator.equals(
    "variant2 product basePrice",
    (variant2Item! as any).variant?.product?.basePrice,
    product.basePrice,
  );
  TestValidator.equals(
    "variant2 product shopName",
    (variant2Item! as any).variant?.product?.shopName,
    (product.seller as any).name,
  );
  // Validation: Cart should have customer info
  TestValidator.equals("cart customer id", cart.customer.id, customerAuth.id);
  // Validation: Cart should have cart id
  TestValidator.predicate("cart should have id", cart.id !== undefined);
  // Validation: timestamps should exist
  TestValidator.predicate(
    "cart should have createdAt",
    cart.createdAt !== undefined,
  );
  TestValidator.predicate(
    "cart should have updatedAt",
    cart.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "variant1 item should have createdAt",
    variant1Item!.createdAt !== undefined,
  );
  TestValidator.predicate(
    "variant1 item should have updatedAt",
    variant1Item!.updatedAt !== undefined,
  );
}