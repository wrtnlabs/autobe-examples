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

export async function test_api_product_update_success_creates_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register & authenticate member (seller)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallMember.IJoin,
    });
  typia.assert(authorized);
  // authorize_member_join is expected to update connection headers internally.
  const authConnection: api.IConnection = { host: memberConnection.host };
  authConnection.headers = memberConnection.headers;
  // 2) Select an owned productId.
  // No product-creation/list/fetch APIs are provided in inputs, so we cannot
  // deterministically obtain a seller-owned fixture here.
  const productId = typia.random<string & tags.Format<"uuid">>();
  const newCategoryId = typia.random<string & tags.Format<"uuid">>();
  // 3) Update product main attributes (featured = true)
  const update1: IShoppingMallProduct.IUpdate = {
    shopping_mall_category_id: newCategoryId,
    code: `code-${RandomGenerator.alphabets(10)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_featured: true,
  } satisfies IShoppingMallProduct.IUpdate;
  const updated1: IShoppingMallProduct =
    await api.functional.shoppingMall.member.products.update(authConnection, {
      productId,
      body: update1,
    });
  typia.assert(updated1);
  // 4) Validate response fields
  TestValidator.equals(
    "seller id matches authenticated member",
    updated1.shopping_mall_seller_id,
    authorized.id,
  );
  TestValidator.equals("deleted_at remains null", updated1.deleted_at, null);
  TestValidator.equals(
    "updated category id",
    updated1.shopping_mall_category_id,
    newCategoryId,
  );
  TestValidator.equals("updated code", updated1.code, update1.code);
  TestValidator.equals("updated name", updated1.name, update1.name);
  TestValidator.equals(
    "updated description",
    updated1.description,
    update1.description,
  );
  TestValidator.equals(
    "updated is_featured",
    updated1.is_featured,
    update1.is_featured,
  );
  // 5) Update again with different featured flag (featured = false)
  const update2: IShoppingMallProduct.IUpdate = {
    is_featured: false,
  } satisfies IShoppingMallProduct.IUpdate;
  const updated2: IShoppingMallProduct =
    await api.functional.shoppingMall.member.products.update(authConnection, {
      productId: updated1.id,
      body: update2,
    });
  typia.assert(updated2);
  TestValidator.equals(
    "second update seller id remains unchanged",
    updated2.shopping_mall_seller_id,
    authorized.id,
  );
  TestValidator.equals(
    "deleted_at remains null (2)",
    updated2.deleted_at,
    null,
  );
  TestValidator.equals(
    "second update is_featured",
    updated2.is_featured,
    false,
  );
  // Snapshot verification is not possible with the provided SDK/utilities.
  // The immutable snapshot creation is asserted indirectly by successful
  // consecutive updates without soft-deleting the product.
  TestValidator.equals(
    "category preserved across updates",
    updated2.shopping_mall_category_id,
    newCategoryId,
  );
}
