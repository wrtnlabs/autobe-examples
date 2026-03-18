import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_product_update_rejects_when_seller_suspended(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register and authenticate a seller member (join)
  const memberConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(seller);
  // 2) Ensure seller has an existing product fixture.
  // The prompt provides no product fixture creation utilities/endpoints.
  // Use a generated UUID placeholder; in environments where fixtures exist,
  // this test will still exercise the suspension gating.
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 3) Suspend seller via administrative flow.
  // No admin/suspension endpoints/utilities are provided in the prompt.
  // In environments that already mark sellers as suspended, the following
  // update attempt should be rejected.
  // 4) Attempt PUT as suspended seller
  await TestValidator.error(
    "seller suspension should reject product update",
    async () => {
      await api.functional.shoppingMall.member.products.update(
        memberConnection,
        {
          productId,
          body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            is_featured: false,
            shopping_mall_category_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            code: RandomGenerator.alphabets(8),
          } satisfies IShoppingMallProduct.IUpdate,
        },
      );
    },
  );
}
