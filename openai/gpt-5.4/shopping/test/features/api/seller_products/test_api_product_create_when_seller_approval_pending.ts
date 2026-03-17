import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_create_when_seller_approval_pending(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  TestValidator.notEquals(
    "newly joined seller is not approved",
    seller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "pending seller has no rejection reason",
    seller.rejection_reason,
    null,
  );
  TestValidator.equals(
    "pending seller is not suspended",
    seller.suspended,
    false,
  );
  TestValidator.equals("pending seller is not banned", seller.banned, false);
  const body = {
    shopping_mall_category_id: null,
    name: RandomGenerator.name(2),
    description: RandomGenerator.content({ paragraphs: 2 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1>
    >() satisfies number as number,
    status: RandomGenerator.alphabets(8),
  } satisfies IShoppingMallProduct.ICreate;
  await TestValidator.error(
    "seller with non-approved status cannot create product",
    async () => {
      await generate_random_shopping_mall_seller_seller_products_create(
        sellerConnection,
        { body },
      );
    },
  );
}
