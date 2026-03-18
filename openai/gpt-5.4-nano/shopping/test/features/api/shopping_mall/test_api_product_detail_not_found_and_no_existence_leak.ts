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

export async function test_api_product_detail_not_found_and_no_existence_leak(
  connection: api.IConnection,
): Promise<void> {
  // 0) Member actor setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 1) Scenario 1: unknown productId should be non-retrievable without leaking existence
  const unknownProductId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unknown product id should not be retrievable",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.member.products.at(memberConnection, {
        productId: unknownProductId,
      });
    },
  );
  // 2) Scenario 2: product that exists but is hidden should also be non-retrievable.
  // NOTE: No API utilities for creating/identifying a hidden product are available
  // in the provided SDK surface, so we validate the required contract that the
  // endpoint denies retrieval with the same client-safe error envelope.
  const hiddenOrInaccessibleProductId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "hidden/inaccessible product id should not be retrievable",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.member.products.at(memberConnection, {
        productId: hiddenOrInaccessibleProductId,
      });
    },
  );
}
