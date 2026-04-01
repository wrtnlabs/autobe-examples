import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_shipping_addresses_create } from "../../../generate/generate_random_mall_platform_customer_shipping_addresses_create";
import { prepare_random_mall_platform_shipping_address } from "../../../prepare/prepare_random_mall_platform_shipping_address";

export async function test_api_cart_checkout_preview_selected_shipping_address(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const cart =
    await api.functional.mallPlatform.customer.carts.create(customerConnection);
  typia.assert(cart);
  const defaultAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          stateProvince: RandomGenerator.name(1),
          postalCode: RandomGenerator.alphaNumeric(8),
          country: RandomGenerator.name(1),
        } satisfies IMallPlatformShippingAddress.ICreate,
      },
    );
  typia.assert(defaultAddress);
  const selectedAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          stateProvince: RandomGenerator.name(1),
          postalCode: RandomGenerator.alphaNumeric(8),
          country: RandomGenerator.name(1),
        } satisfies IMallPlatformShippingAddress.ICreate,
      },
    );
  typia.assert(selectedAddress);
  const preview =
    await api.functional.mallPlatform.customer.carts.checkout_preview.search(
      customerConnection,
      {
        body: {
          shippingAddressId: selectedAddress.id,
        } satisfies IMallPlatformShoppingCart.IRequest,
      },
    );
  typia.assert(preview);
  TestValidator.equals(
    "selected shipping address id",
    preview.shippingAddress.id,
    selectedAddress.id,
  );
  TestValidator.equals(
    "selected shipping address recipient",
    preview.shippingAddress.recipientName,
    selectedAddress.recipientName,
  );
  TestValidator.notEquals(
    "selected address differs from default",
    preview.shippingAddress.id,
    defaultAddress.id,
  );
  TestValidator.equals("cart id remains unchanged", preview.cart.id, cart.id);
  const cartItems = cart.cartItems ?? [];
  TestValidator.equals(
    "cart item count remains unchanged",
    preview.cart.cartItems.length,
    cartItems.length,
  );
  TestValidator.equals(
    "preview cart total matches current cart",
    preview.subtotal + preview.shippingFee,
    preview.total,
  );
  TestValidator.predicate(
    "checkout preview should be available for selected address",
    preview.isCheckoutAvailable,
  );
}
