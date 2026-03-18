import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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

export async function test_api_products_customer_browsing_excludes_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register a member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Create at least two products as the seller
  const p1 = await generate_random_shopping_mall_member_products_create_product(
    memberConnection,
    {},
  );
  typia.assert(p1);
  const p2 = await generate_random_shopping_mall_member_products_create_product(
    memberConnection,
    {},
  );
  typia.assert(p2);
  // Soft-delete one product
  await api.functional.shoppingMall.member.products.erase(memberConnection, {
    productId: p1.id,
  });
  // 3) Browse products
  const page1 = await api.functional.shoppingMall.member.products.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(page1);
  const { pagination, data } = page1;
  TestValidator.equals("pagination.current", pagination.current, 1);
  TestValidator.equals("pagination.limit", pagination.limit, 100);
  TestValidator.predicate(
    "data.length <= limit",
    data.length <= pagination.limit,
  );
  TestValidator.predicate(
    "pagination.records >= data.length",
    pagination.records >= data.length,
  );
  TestValidator.predicate(
    "pagination.pages matches ceil(records/limit)",
    pagination.pages ===
      (pagination.records === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit)),
  );
  // Validate that soft-deleted product is excluded
  TestValidator.predicate(
    "deleted product not present",
    !data.some((x) => x.id === p1.id),
  );
  TestValidator.predicate(
    "all returned products not soft-deleted",
    data.every((x) => x.deleted_at === null),
  );
  // Each returned item contains required summary fields as per typia.assert.
}
