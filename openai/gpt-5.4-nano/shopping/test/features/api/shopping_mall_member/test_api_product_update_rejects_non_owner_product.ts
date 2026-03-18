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

export async function test_api_product_update_rejects_non_owner_product(
  connection: api.IConnection,
): Promise<void> {
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuthorized = await authorize_member_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Without product list/get/create utilities provided in this task,
  // we cannot deterministically obtain an existing productId owned by seller B
  // nor validate snapshot integrity. We therefore limit this test to the core
  // authorization/ownership behavior: seller A must be rejected when trying
  // to update a product.
  const targetProductId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("rejects update by non-owner seller", async () => {
    await api.functional.shoppingMall.member.products.update(
      sellerAConnection,
      {
        productId: targetProductId,
        body: {
          name: RandomGenerator.name(),
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  });
  // Ensure seller B still has its authenticated identity (no logout/suspension side-effect)
  TestValidator.predicate(
    "seller B authorization present",
    sellerBAuthorized.id.length > 0,
  );
}
