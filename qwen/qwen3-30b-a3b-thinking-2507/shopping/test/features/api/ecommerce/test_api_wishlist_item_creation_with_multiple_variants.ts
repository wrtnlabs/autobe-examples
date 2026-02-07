import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerEmailVerification";
import type { IEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerPasswordReset";
import type { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import type { IEcommerceDefaultAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDefaultAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
import { generate_random_ecommerce_customer_wishlist_items_create } from "../../../generate/generate_random_ecommerce_customer_wishlist_items_create";
import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { generate_random_ecommerce_products_variants_create } from "../../../generate/generate_random_ecommerce_products_variants_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_wishlist_item } from "../../../prepare/prepare_random_ecommerce_wishlist_item";

export async function test_api_wishlist_item_creation_with_multiple_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create category for product organization
  const category = await generate_random_ecommerce_categories_create(
    connection,
    {},
  );
  typia.assert(category);
  // 2. Create product with the category
  const product = await generate_random_ecommerce_products_create(connection, {
    body: { categoriesId: category.id },
  });
  typia.assert(product);
  // 3. Create first product variant with distinct price
  const variant1 = await generate_random_ecommerce_products_variants_create(
    connection,
    {
      body: {
        price: typia.random<number & tags.Minimum<1>>(),
        stock_quantity: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      },
      params: { productId: product.id },
    },
  );
  typia.assert(variant1);
  // 4. Create second product variant with different price
  const variant2 = await generate_random_ecommerce_products_variants_create(
    connection,
    {
      body: {
        price: typia.random<number & tags.Minimum<1>>(),
        stock_quantity: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      },
      params: { productId: product.id },
    },
  );
  typia.assert(variant2);
  // 5. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://localhost/",
      referrer: "https://localhost/",
    },
  });
  // 6. Add first variant to wishlist
  const wishlistItem1 =
    await generate_random_ecommerce_customer_wishlist_items_create(
      customerConnection,
      {
        body: { productVariantId: variant1.id },
      },
    );
  typia.assert(wishlistItem1);
  // 7. Add second variant to wishlist
  const wishlistItem2 =
    await generate_random_ecommerce_customer_wishlist_items_create(
      customerConnection,
      {
        body: { productVariantId: variant2.id },
      },
    );
  typia.assert(wishlistItem2);
  // 8. Validate wishlist items contain correct prices
  TestValidator.equals(
    "First variant price matches",
    wishlistItem1.price,
    variant1.price,
  );
  TestValidator.equals(
    "Second variant price matches",
    wishlistItem2.price,
    variant2.price,
  );
}
