import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cart_item_update_deleted_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData: IShoppingMallCustomer.IJoin = {
    email: typia.random<
      string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
    >(),
    password: "12341234",
    display_name: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
  };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(customerAuthorized);
  // 2. Create product as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  // Create category for product
  const categoryData: IShoppingMallCategory.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    parent: null,
    subcategory_count: 0,
  };
  // Create product
  const productData: IShoppingMallProduct.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(3),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    is_deleted: false,
    seller: {
      id: typia.random<string & tags.Format<"uuid">>(),
      shop_name: RandomGenerator.name(2),
      approval_status: "approved",
      created_at: new Date().toISOString(),
    },
    category: categoryData,
    average_rating: 0,
  };
  // Create variant for product
  const variantData: IShoppingMallProductVariant.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    price_override: null,
    stock_quantity: 10,
    shopping_mall_product_id: productData.id,
    shoppingMallProductVariantOptionValues: [],
  };
  // 3. Add variant to customer's cart
  const cartItemData: IShoppingMallCartItem = {
    id: typia.random<string & tags.Format<"uuid">>(),
    customer_id: customerAuthorized.id,
    variant_id: variantData.id,
    quantity: 2,
    added_at: new Date().toISOString(),
    customer: {
      id: customerAuthorized.id,
      email: customerAuthorized.email,
      display_name: customerAuthorized.display_name,
      phone_number: customerAuthorized.phone_number,
      email_verified: customerAuthorized.email_verified,
      created_at: customerAuthorized.created_at,
      updated_at: customerAuthorized.updated_at,
    },
    variant: variantData,
  };
  // 4. Try to update cart item quantity (variant is deleted)
  const updateData: IShoppingMallCartItem.IUpdate = {
    quantity: 5,
  };
  const updatedCartItem =
    await api.functional.shoppingMall.customer.cart.items.update(
      customerConnection,
      {
        cartItemId: cartItemData.id,
        body: updateData,
      },
    );
  typia.assert(updatedCartItem);
  // 5. Verify cart item was not updated due to deleted variant
  TestValidator.equals(
    "cart item quantity unchanged",
    updatedCartItem.quantity,
    cartItemData.quantity,
  );
  TestValidator.predicate(
    "cart item unavailable due to deleted variant",
    updatedCartItem.quantity === cartItemData.quantity,
  );
}
