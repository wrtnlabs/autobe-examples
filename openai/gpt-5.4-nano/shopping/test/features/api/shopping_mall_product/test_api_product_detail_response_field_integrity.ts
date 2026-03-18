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

export async function test_api_product_detail_response_field_integrity(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Use a UUID as productId (active product expected for this member)
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Scenario 1: verify deleted_at is null and capture immutable fields
  const product1 = await api.functional.shoppingMall.member.products.at(
    memberConnection,
    {
      productId,
    },
  );
  typia.assert(product1);
  TestValidator.equals("deleted_at is null", product1.deleted_at, null);
  // Scenario 2: toggle is_featured and validate field integrity
  const nextIsFeatured = !product1.is_featured;
  const updated = await api.functional.shoppingMall.member.products.update(
    memberConnection,
    {
      productId,
      body: {
        is_featured: nextIsFeatured,
      } satisfies IShoppingMallProduct.IUpdate,
    },
  );
  typia.assert(updated);
  const product2 = await api.functional.shoppingMall.member.products.at(
    memberConnection,
    {
      productId,
    },
  );
  typia.assert(product2);
  TestValidator.equals("id unchanged", product2.id, product1.id);
  TestValidator.equals("code unchanged", product2.code, product1.code);
  TestValidator.equals("name unchanged", product2.name, product1.name);
  TestValidator.equals(
    "description unchanged",
    product2.description,
    product1.description,
  );
  TestValidator.equals(
    "is_featured toggled",
    product2.is_featured,
    nextIsFeatured,
  );
  TestValidator.equals("deleted_at still null", product2.deleted_at, null);
  TestValidator.equals("updated id unchanged", updated.id, product1.id);
  TestValidator.equals(
    "updated is_featured",
    updated.is_featured,
    nextIsFeatured,
  );
}
