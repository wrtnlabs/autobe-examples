import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_carts_items_post } from "../../../generate/generate_random_mall_platform_customer_carts_items_post";
import { prepare_random_mall_platform_cart_item } from "../../../prepare/prepare_random_mall_platform_cart_item";

export async function test_api_cart_add_variant_quantity_merge(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const firstQuantity = 1;
  const secondQuantity = 2;
  const firstItem =
    await generate_random_mall_platform_customer_carts_items_post(
      customerConnection,
      {
        body: {
          mall_platform_product_variant_id: typia.random<string>(),
          quantity: firstQuantity,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(firstItem);
  const mergedItem =
    await generate_random_mall_platform_customer_carts_items_post(
      customerConnection,
      {
        body: {
          mall_platform_product_variant_id: firstItem.productVariant.id,
          quantity: secondQuantity,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(mergedItem);
  TestValidator.equals(
    "second cart add should target the same variant",
    mergedItem.productVariant.id,
    firstItem.productVariant.id,
  );
  TestValidator.equals(
    "cart item quantity should merge into one line",
    mergedItem.quantity,
    firstQuantity + secondQuantity,
  );
  TestValidator.equals(
    "the original cart item variant should remain unchanged",
    firstItem.productVariant.id,
    mergedItem.productVariant.id,
  );
}
