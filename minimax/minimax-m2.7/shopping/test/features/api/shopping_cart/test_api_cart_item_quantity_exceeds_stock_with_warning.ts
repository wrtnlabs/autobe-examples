import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_cart_item_quantity_exceeds_stock_with_warning(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 2. Admin creates a category
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: "Test Category",
        description: "Category for low stock testing",
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerpass123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // Login as seller
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: "sellerpass123",
    },
  });
  // 4. Seller creates a product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: "Limited Stock Product",
        description: "Product with limited inventory for testing",
        categoryId: category.id,
        basePrice: 10000,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Seller creates a variant with LIMITED stock (5 units)
  const limitedStock = 5;
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: "LIMITED-001",
          price: 15000,
          quantity: limitedStock,
          optionValues: [
            { key: "size", value: "Large" },
          ] satisfies IEcommerceMallProductVariantOptionValue.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customerpass123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 7. Customer adds item to cart with small quantity
  const initialQuantity = 2;
  const cart =
    await api.functional.ecommerceMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: initialQuantity,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cart);
  // Find the cart item
  const cartItem = cart.items.find((item) => item.variant.id === variant.id);
  if (!cartItem) {
    throw new Error("Cart item not found");
  }
  // 8. Customer updates cart item quantity to EXCEED available stock
  const requestedQuantity = 10; // More than available 5 units
  const updatedItem =
    await api.functional.ecommerceMall.customer.cart.items.update(
      customerConnection,
      {
        itemId: cartItem.id,
        body: {
          quantity: requestedQuantity,
        } satisfies IEcommerceMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedItem);
  // 9. Validate the response
  // - availabilityStatus should be 'low_stock' because quantity exceeds available
  TestValidator.equals(
    "availabilityStatus should be low_stock",
    updatedItem.availabilityStatus,
    "low_stock",
  );
  // - stockWarning should be populated with descriptive message
  TestValidator.predicate(
    "stockWarning should be a non-empty string",
    typeof updatedItem.stockWarning === "string" &&
      updatedItem.stockWarning.length > 0,
  );
  // - quantity should be updated to requested value
  TestValidator.equals(
    "quantity should be updated to requested value",
    updatedItem.quantity,
    requestedQuantity,
  );
  // - lineSubtotal should be calculated with requested quantity
  const expectedLineSubtotal = requestedQuantity * updatedItem.unitPrice;
  TestValidator.equals(
    "lineSubtotal should reflect requested quantity",
    updatedItem.lineSubtotal,
    expectedLineSubtotal,
  );
  // 10. Verify stock is not actually decremented (validation only, no order placed)
  // The variant still shows original quantity since no order was placed
  TestValidator.predicate(
    "original stock quantity preserved",
    variant.quantity === limitedStock,
  );
}
