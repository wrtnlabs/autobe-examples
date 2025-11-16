import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentials";
import type { IShoppingMallRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskFlag";

/**
 * Validate that requesting an authentication credential detail with an unknown
 * identifier fails without authentication using the detail endpoint.
 *
 * Business intent
 *
 * - Ensure that the auth credentials detail endpoint does not succeed when a
 *   caller queries a non-existent credential id.
 * - The scenario treats the random UUID as non-existent; if the backend
 *   simulation returns a successful DTO, this is acceptable in simulate mode
 *   but in real environments we expect a failure.
 * - In accordance with global E2E rules, the test only checks that an error
 *   occurs, not the concrete HTTP status code or error body.
 *
 * Steps
 *
 * 1. Generate a random UUID value to act as an unknown authCredentialsId.
 * 2. Create an unauthenticated connection by shallow-cloning the provided
 *    connection and forcing headers to an empty object, without ever touching
 *    or mutating the original connection.headers.
 * 3. Call api.functional.shoppingMall.authCredentials.at with that unknown id
 *    inside TestValidator.error using an async closure and await, asserting
 *    only that an error is thrown.
 * 4. Repeat the failing call with the same id to demonstrate consistent behavior
 *    for repeated requests.
 */
export async function test_api_auth_credentials_detail_view_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Prepare an unknown UUID for the auth credential id.
  const unknownAuthCredentialsId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Create an unauthenticated connection without mutating the original.
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. First attempt: expect the detail view call to fail for unknown id.
  await TestValidator.error(
    "unknown auth credential id should fail",
    async () => {
      await api.functional.shoppingMall.authCredentials.at(unauthConnection, {
        authCredentialsId: unknownAuthCredentialsId,
      });
    },
  );

  // 4. Second attempt with the same id to confirm consistent failure.
  await TestValidator.error(
    "repeated unknown auth credential id should consistently fail",
    async () => {
      await api.functional.shoppingMall.authCredentials.at(unauthConnection, {
        authCredentialsId: unknownAuthCredentialsId,
      });
    },
  );
}
