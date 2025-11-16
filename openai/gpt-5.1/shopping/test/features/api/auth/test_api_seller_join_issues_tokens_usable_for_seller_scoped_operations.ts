import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

export async function test_api_seller_join_issues_tokens_usable_for_seller_scoped_operations(
  connection: api.IConnection,
) {
  // 1. Prepare a valid and unique seller join request body.
  const requestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(2),
    // contactPhone is optional; include a realistic value to exercise the field
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  // 2. Call the seller join endpoint to register and authenticate the seller.
  const authorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: requestBody,
    });

  // Type-level assurance that the response matches the declared DTO.
  typia.assert<IShoppingMallSeller.IAuthorized>(authorized);

  // 3. Basic business validations on the authorization payload.
  //    These focus on logical consistency rather than type/format, which
  //    typia.assert already covers.

  // Seller summary should represent the same actor as the top-level fields.
  TestValidator.equals(
    "seller summary id matches top-level id",
    authorized.seller.id,
    authorized.id,
  );
  TestValidator.equals(
    "seller summary email matches top-level email",
    authorized.seller.email,
    authorized.email,
  );
  TestValidator.equals(
    "seller summary store_name matches top-level store_name",
    authorized.seller.store_name,
    authorized.store_name,
  );
  TestValidator.equals(
    "seller summary status matches top-level status",
    authorized.seller.status,
    authorized.status,
  );

  // Token fields should be non-empty strings at business level.
  TestValidator.predicate(
    "access token must be non-empty string",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token must be non-empty string",
    authorized.token.refresh.length > 0,
  );

  // 4. Validate that the SDK has installed the access token into
  //    the shared connection headers as documented in join().
  //    We only READ connection.headers; we do not mutate it.
  const headers = connection.headers;

  // connection.headers must exist after join(), because the SDK
  // sets it up when it writes Authorization.
  TestValidator.predicate(
    "connection headers must be defined after join",
    headers !== undefined,
  );

  // When headers is defined, Authorization header should equal
  // the issued access token.
  if (headers !== undefined) {
    const authorizationHeader = headers.Authorization;

    TestValidator.predicate(
      "Authorization header must be present after join",
      authorizationHeader !== undefined &&
        authorizationHeader !== null &&
        authorizationHeader.toString().length > 0,
    );

    TestValidator.equals(
      "Authorization header must equal issued access token",
      authorizationHeader,
      authorized.token.access,
    );
  }
}
