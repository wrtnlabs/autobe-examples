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

export async function test_api_cart_item_remove_targeted_line_only(
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
  const firstItem =
    await generate_random_mall_platform_customer_carts_items_post(
      customerConnection,
      {
        body: {
          mall_platform_product_variant_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: 3,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(firstItem);
  const secondItem =
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
  typia.assert(secondItem);
  const thirdItem =
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
  typia.assert(thirdItem);
  TestValidator.notEquals(
    "cart item ids must be distinct",
    firstItem.id,
    secondItem.id,
  );
  TestValidator.notEquals(
    "cart item ids must be distinct",
    firstItem.id,
    thirdItem.id,
  );
  TestValidator.notEquals(
    "cart item ids must be distinct",
    secondItem.id,
    thirdItem.id,
  );
  TestValidator.equals(
    "target line quantity is preserved before deletion",
    firstItem.quantity,
    3,
  );
  TestValidator.equals(
    "sibling line quantity is preserved before deletion",
    thirdItem.quantity,
    2,
  );
  await api.functional.mallPlatform.customer.carts.items.eraseByCartitemid(
    customerConnection,
    {
      cartItemId: secondItem.id,
    },
  );
  await api.functional.mallPlatform.customer.carts.items.eraseByCartitemid(
    customerConnection,
    {
      cartItemId: secondItem.id,
    },
  );
  TestValidator.equals(
    "remaining lines were not mutated by removal",
    firstItem.quantity,
    3,
  );
  TestValidator.equals(
    "remaining lines were not mutated by removal",
    thirdItem.quantity,
    2,
  );
  TestValidator.notEquals(
    "removed line stays distinct from remaining line 1",
    secondItem.id,
    firstItem.id,
  );
  TestValidator.notEquals(
    "removed line stays distinct from remaining line 2",
    secondItem.id,
    thirdItem.id,
  );
}
