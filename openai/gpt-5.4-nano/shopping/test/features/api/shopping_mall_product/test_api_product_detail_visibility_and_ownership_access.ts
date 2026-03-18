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

export async function test_api_product_detail_visibility_and_ownership_access(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAAuth);
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberBAuth);
  const candidateProductId = () => typia.random<string & tags.Format<"uuid">>();
  // Find an active product (deleted_at == null)
  let activeProduct: IShoppingMallProduct | undefined;
  for (const _ of ArrayUtil.repeat(10, () => 0)) {
    const productId = candidateProductId();
    try {
      const output = await api.functional.shoppingMall.member.products.at(
        memberAConnection,
        { productId },
      );
      typia.assert(output);
      if (output.deleted_at === null) {
        activeProduct = output;
        break;
      }
    } catch {
      // ignore and continue searching
    }
  }
  if (!activeProduct) {
    throw new Error("Unable to find an active product for visibility test");
  }
  // Active product should be viewable by another member
  const activeResponse = await api.functional.shoppingMall.member.products.at(
    memberBConnection,
    { productId: activeProduct.id },
  );
  typia.assert(activeResponse);
  TestValidator.equals(
    "active product id",
    activeResponse.id,
    activeProduct.id,
  );
  TestValidator.equals(
    "active seller id",
    activeResponse.shopping_mall_seller_id,
    activeProduct.shopping_mall_seller_id,
  );
  TestValidator.equals(
    "active category id",
    activeResponse.shopping_mall_category_id,
    activeProduct.shopping_mall_category_id,
  );
  TestValidator.equals("active deleted_at", activeResponse.deleted_at, null);
  TestValidator.equals("active code", activeResponse.code, activeProduct.code);
  TestValidator.equals("active name", activeResponse.name, activeProduct.name);
  // Find a hidden product owned by memberA (deleted_at != null and seller matches memberA)
  let hiddenOwnedProduct: IShoppingMallProduct | undefined;
  for (const _ of ArrayUtil.repeat(20, () => 0)) {
    const productId = candidateProductId();
    try {
      const output = await api.functional.shoppingMall.member.products.at(
        memberAConnection,
        { productId },
      );
      typia.assert(output);
      if (
        output.deleted_at !== null &&
        output.shopping_mall_seller_id === memberAAuth.id
      ) {
        hiddenOwnedProduct = output;
        break;
      }
    } catch {
      // ignore and continue searching
    }
  }
  if (!hiddenOwnedProduct) {
    throw new Error(
      "Unable to find a hidden product owned by memberA for ownership access test",
    );
  }
  const hiddenSuccess = await api.functional.shoppingMall.member.products.at(
    memberAConnection,
    { productId: hiddenOwnedProduct.id },
  );
  typia.assert(hiddenSuccess);
  TestValidator.equals(
    "hidden owned product id",
    hiddenSuccess.id,
    hiddenOwnedProduct.id,
  );
  TestValidator.predicate(
    "hidden owned deleted_at is non-null",
    hiddenSuccess.deleted_at !== null,
  );
  TestValidator.equals(
    "hidden owned seller id",
    hiddenSuccess.shopping_mall_seller_id,
    memberAAuth.id,
  );
  await TestValidator.httpError(
    "memberB cannot view hidden product owned by memberA",
    [401, 403, 404],
    async () => {
      await api.functional.shoppingMall.member.products.at(memberBConnection, {
        productId: hiddenOwnedProduct.id,
      });
    },
  );
}
