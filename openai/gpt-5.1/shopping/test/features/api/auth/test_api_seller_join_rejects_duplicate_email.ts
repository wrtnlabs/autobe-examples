import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

export async function test_api_seller_join_rejects_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Generate a unique, valid seller email
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // 2. First join request body
  const firstJoinBody = {
    email,
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  // 3. Perform first join call and validate response
  const firstAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: firstJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(firstAuthorized);

  // 4. Business-level validations for first join
  TestValidator.equals(
    "first join: email should match input",
    firstAuthorized.email,
    email,
  );
  TestValidator.equals(
    "first join: store_name should match input storeName",
    firstAuthorized.store_name,
    firstJoinBody.storeName,
  );

  // contact_phone is optional and nullable; just ensure it equals what we sent
  TestValidator.equals(
    "first join: contact_phone should match input contactPhone",
    firstAuthorized.contact_phone ?? undefined,
    firstJoinBody.contactPhone,
  );

  // 5. Second join attempt with same email but different storeName/password/phone
  const secondJoinBody = {
    email,
    password: RandomGenerator.alphaNumeric(18),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  // 6. Expect business error on duplicate email
  await TestValidator.error(
    "duplicate seller email must be rejected",
    async () => {
      await api.functional.auth.seller.join(connection, {
        body: secondJoinBody,
      });
    },
  );
}
