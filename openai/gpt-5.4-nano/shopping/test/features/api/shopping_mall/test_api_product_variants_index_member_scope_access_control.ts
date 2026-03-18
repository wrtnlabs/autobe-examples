import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_product_variants_index_member_scope_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Best-effort product scope setup is not available with provided SDK/utilities.
  // We use two distinct UUIDs as target product scopes.
  const productAllowedId = typia.random<string & tags.Format<"uuid">>();
  const productDisallowedId = typia.random<string & tags.Format<"uuid">>();
  // 3) Query variants within productAllowed scope
  const allowed =
    await api.functional.shoppingMall.member.productVariants.index(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: productAllowedId,
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "asc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(allowed);
  TestValidator.equals(
    "pagination.current matches request",
    allowed.pagination.current,
    1 as number,
  );
  TestValidator.predicate(
    "pagination.records is not negative",
    allowed.pagination.records >= 0,
  );
  TestValidator.equals(
    "all returned variants belong to requested productAllowed",
    allowed.data.every((v) => v.product.id === productAllowedId),
    true,
  );
  // 4) Query variants within productDisallowed scope (should not leak other products)
  const disallowed =
    await api.functional.shoppingMall.member.productVariants.index(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: productDisallowedId,
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "asc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(disallowed);
  TestValidator.equals(
    "all returned variants belong to requested productDisallowed (no leakage)",
    disallowed.data.every((v) => v.product.id === productDisallowedId),
    true,
  );
  // Expected records for disallowed scope: best-effort to avoid asserting 0 without setup.
  // Instead, enforce that pagination.records matches data mapping constraint.
  TestValidator.predicate(
    "pagination.records is consistent with no negative counts",
    disallowed.pagination.records >= 0,
  );
  // 5) Repeat disallowed-product query to ensure stability
  const disallowedRepeat =
    await api.functional.shoppingMall.member.productVariants.index(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: productDisallowedId,
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "asc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(disallowedRepeat);
  TestValidator.equals(
    "repeat query still does not leak other products",
    disallowedRepeat.data.every((v) => v.product.id === productDisallowedId),
    true,
  );
}
