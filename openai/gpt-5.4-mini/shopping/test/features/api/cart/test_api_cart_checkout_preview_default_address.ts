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

export async function test_api_cart_checkout_preview_default_address(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const cart =
    await api.functional.mallPlatform.customer.carts.create(customerConnection);
  typia.assert(cart);
  const preview =
    await api.functional.mallPlatform.customer.carts.checkout_preview.search(
      customerConnection,
      { body: {} satisfies IMallPlatformShoppingCart.IRequest },
    );
  typia.assert(preview);
  TestValidator.equals(
    "preview cart id matches created cart",
    preview.cart.id,
    cart.id,
  );
  TestValidator.equals(
    "preview cart customer id matches",
    preview.cart.customer.id,
    customer.id,
  );
  TestValidator.predicate(
    "checkout preview has a shipping address",
    preview.shippingAddress.id.length > 0,
  );
  TestValidator.predicate(
    "checkout preview has non-negative subtotal",
    preview.subtotal >= 0,
  );
  TestValidator.predicate(
    "checkout preview has non-negative shipping fee",
    preview.shippingFee >= 0,
  );
  TestValidator.predicate(
    "checkout preview has non-negative total",
    preview.total >= 0,
  );
  TestValidator.predicate(
    "checkout preview warnings are present as an array",
    Array.isArray(preview.warnings),
  );
}
