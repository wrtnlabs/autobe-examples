import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_image_update_metadata_without_affecting_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  // The available materials for this task do not include any endpoint to
  // create or list product images. Without an existing productImageId returned
  // by the server, we cannot test successful metadata updates.
  // Instead, we ensure that the endpoint rejects an invalid/non-existent
  // productImageId with validly-typed payload (no status-code assertions).
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  await generate_random_shopping_mall_member_products_create_product(
    memberConnection,
    {},
  );
  const invalidProductImageId = typia.random<string & tags.Format<"uuid">>();
  const href = typia.random<string & tags.Format<"url">>();
  const alt_text = typia.random<string & tags.MinLength<1>>();
  await TestValidator.error(
    "updateProductImage should reject non-existent productImageId",
    async () => {
      await api.functional.shoppingMall.member.productImages.updateProductImage(
        memberConnection,
        {
          productImageId: invalidProductImageId,
          body: {
            href,
            alt_text,
          } satisfies IShoppingMallProductImage.IUpdate,
        },
      );
    },
  );
}
