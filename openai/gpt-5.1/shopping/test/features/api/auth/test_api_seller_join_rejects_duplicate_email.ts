import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_seller_join_rejects_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Prepare a deterministic but random-looking email and valid join payload
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const firstJoinBody = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    // Let the backend derive IP if omitted; href/referrer must be valid URIs
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  // 2. First join call should succeed and return an authorized seller
  const firstAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: firstJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(firstAuthorized);

  // Basic sanity checks on important fields
  TestValidator.predicate(
    "first join should return same email as requested",
    firstAuthorized.email === email,
  );

  // 3. Second join attempt with the same email but different password/session
  const secondJoinBody = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  // 4. Expect the second join to fail due to email uniqueness constraint.
  // Use TestValidator.error to assert that some error is thrown, without
  // checking concrete status codes or error payload details.
  await TestValidator.error(
    "duplicate seller join with same email must fail",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: secondJoinBody,
      });
    },
  );
}
