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

export async function test_api_cart_item_remove_own_item(
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
  const firstCreated =
    await generate_random_mall_platform_customer_carts_items_post(
      customerConnection,
      {
        body: {
          mall_platform_product_variant_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: 1,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(firstCreated);
  const secondCreated =
    await generate_random_mall_platform_customer_carts_items_post(
      customerConnection,
      {
        body: {
          mall_platform_product_variant_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: 2,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(secondCreated);
  TestValidator.notEquals(
    "cart items should be different entries",
    firstCreated.id,
    secondCreated.id,
  );
  TestValidator.equals(
    "first cart item quantity should match request",
    firstCreated.quantity,
    1,
  );
  TestValidator.equals(
    "second cart item quantity should match request",
    secondCreated.quantity,
    2,
  );
  await api.functional.mallPlatform.customer.carts.items.eraseByCartitemid(
    customerConnection,
    {
      cartItemId: firstCreated.id,
    },
  );
  await api.functional.mallPlatform.customer.carts.items.eraseByCartitemid(
    customerConnection,
    {
      cartItemId: firstCreated.id,
    },
  );
  TestValidator.equals(
    "remaining cart item should keep its identifier",
    secondCreated.id,
    secondCreated.id,
  );
  TestValidator.equals(
    "remaining cart item should keep its quantity",
    secondCreated.quantity,
    2,
  );
}
