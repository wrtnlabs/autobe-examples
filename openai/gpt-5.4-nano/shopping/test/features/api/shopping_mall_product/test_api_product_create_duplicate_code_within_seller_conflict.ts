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
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_create_duplicate_code_within_seller_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate member (join)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const safeMemberAuth = typia.assert(memberAuth);
  // Use the same actor-specific connection that now carries Authorization header
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = memberConnection.headers;
  // 2) Create initial product with a seller-scoped code
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const code = RandomGenerator.alphaNumeric(8);
  const firstProduct =
    await generate_random_shopping_mall_member_products_create_product(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: categoryId,
          code,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_featured: false,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(firstProduct);
  // 3) Attempt duplicate create with the same code
  await TestValidator.error(
    "duplicate seller-scoped product code should fail with business conflict",
    async () => {
      await generate_random_shopping_mall_member_products_create_product(
        sellerConnection,
        {
          body: {
            shopping_mall_category_id: categoryId,
            code,
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 4 }),
            is_featured: true,
          } satisfies IShoppingMallProduct.ICreate,
        },
      );
    },
  );
  // 4-5) Invariant: first product remains intact
  TestValidator.equals(
    "seller-owned code must remain the same",
    firstProduct.code,
    code,
  );
  TestValidator.equals(
    "product seller must be the authenticated member",
    firstProduct.shopping_mall_seller_id,
    safeMemberAuth.id,
  );
}
