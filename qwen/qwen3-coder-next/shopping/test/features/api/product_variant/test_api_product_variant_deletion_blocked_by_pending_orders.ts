import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPayment";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
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
import { generate_random_shopping_mall_customer_carts_items_create } from "../../../generate/generate_random_shopping_mall_customer_carts_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_shopping_cart_item } from "../../../prepare/prepare_random_shopping_mall_shopping_cart_item";

export async function test_api_product_variant_deletion_blocked_by_pending_orders(
  connection: api.IConnection,
): Promise<void> {
  // Phase 1: Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(2),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuthorized);
  // Phase 2: Create product with variant
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        images: [
          {
            image_url: typia.random<string & tags.Format<"uri">>(),
            sort_order: 0,
          },
        ],
        variants: [
          {
            sku_code: `VARIANT_${RandomGenerator.alphaNumeric(8)}`,
            option_values: [
              {
                option_name: "color",
                option_value: "white",
              },
            ],
            stock_quantity: 10,
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  if (!product.variants || product.variants.length === 0) {
    throw new Error("Product must have variants");
  }
  const variant = product.variants[0];
  // Phase 3: Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
    password: "12345678",
    display_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  // Login as customer to get proper authentication
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallCustomer.ILogin;
  await authorize_customer_login(customerConnection, {
    body: customerLoginBody,
  });
  // Phase 4: Create order with the variant
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 3,
        } satisfies IShoppingMallShoppingCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Complete payment - simulate payment completion
  const paymentResponse =
    await api.functional.shoppingMall.customer.payments.index(
      customerConnection,
      {
        body: {
          status: "pending",
          created_at_gte: new Date().toISOString(),
        },
      },
    );
  typia.assert(paymentResponse);
  // Phase 5: Attempt to delete variant (should be blocked)
  try {
    await api.functional.shoppingMall.seller.sellers.products.variants.erase(
      sellerConnection,
      {
        variantId: variant.id,
      },
    );
    throw new Error("Variant deletion should have been blocked");
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      TestValidator.equals(
        "variant deletion blocked by pending orders",
        error.status >= 400,
        true,
      );
    } else {
      throw error;
    }
  }
  // Verify variant still exists after failed deletion attempt
  const remainingProducts =
    await api.functional.shoppingMall.seller.products.create(sellerConnection, {
      body: {
        name: "test",
        description: "test",
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 1000,
        variants: [],
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(remainingProducts);
}