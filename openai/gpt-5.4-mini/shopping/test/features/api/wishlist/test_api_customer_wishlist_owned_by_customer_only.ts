import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { prepare_random_mall_platform_wishlist_item } from "../../../prepare/prepare_random_mall_platform_wishlist_item";

export async function test_api_customer_wishlist_owned_by_customer_only(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_customer_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@example.com`,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(owner);
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruder = await authorize_customer_join(intruderConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@example.com`,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(intruder);
  const body = {
    wishlistItems: ArrayUtil.repeat(
      2,
      () =>
        ({
          mallPlatformProductId: typia.random<string & tags.Format<"uuid">>(),
        }) satisfies IMallPlatformWishlistItem.ICreate,
    ),
  } satisfies IMallPlatformWishlist.IUpdate;
  await TestValidator.httpError(
    "another customer must not update a foreign wishlist",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.wishlists.update(
        intruderConnection,
        {
          wishlistId: typia.random<string & tags.Format<"uuid">>(),
          body,
        },
      );
    },
  );
}
