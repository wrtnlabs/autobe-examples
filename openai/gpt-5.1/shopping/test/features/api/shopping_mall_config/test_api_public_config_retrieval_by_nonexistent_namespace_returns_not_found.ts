import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

/**
 * Validate 404 behavior for configuration lookup by nonexistent namespace.
 *
 * Business goal: Ensure that the public configuration lookup endpoint `GET
 * /shoppingMall/configs/byNamespace/{namespace}` correctly signals that a
 * configuration does not exist when a caller provides an unknown namespace,
 * even when called without any Authorization headers.
 *
 * Scope and assumptions:
 *
 * - Only the read-only lookup API is available in this test; we do not create or
 *   mutate configuration records here.
 * - Non-existence is ensured probabilistically by using a highly random,
 *   synthetic namespace value that is extremely unlikely to be present in the
 *   database.
 * - The SDK represents HTTP failures using `HttpError` from `@nestia/fetcher`. We
 *   rely on `TestValidator.httpError` to assert that a 404 status is produced.
 * - We do not inspect the error payload shape or contents beyond status code;
 *   type details for error bodies are intentionally not validated.
 *
 * Test steps:
 *
 * 1. Generate a random namespace string, e.g., a long alphanumeric token prefixed
 *    with a stable marker to make debugging easier.
 * 2. Create an unauthenticated connection derived from the given `connection`, by
 *    shallow-cloning and overriding `headers` with an empty object.
 * 3. Call `api.functional.shoppingMall.configs.byNamespace.at` using the
 *    unauthenticated connection and the random namespace.
 * 4. Use `TestValidator.httpError` to assert that the call results in an HTTP 404
 *    error.
 * 5. Repeat the failing request multiple times (e.g., 3 times) to ensure
 *    consistent behavior for the same nonexistent namespace value.
 */
export async function test_api_public_config_retrieval_by_nonexistent_namespace_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random namespace that is extremely unlikely to exist.
  const randomSuffix: string = RandomGenerator.alphaNumeric(32);
  const namespace: string = `e2e-nonexistent-namespace-${randomSuffix}`;

  // 2. Build an unauthenticated connection (do not manipulate headers after creation).
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3-5. Repeatedly call the endpoint and ensure a 404 HttpError is thrown.
  const repeatCount = 3;
  for (let i = 0; i < repeatCount; i++) {
    await TestValidator.httpError(
      "nonexistent namespace should return 404",
      404,
      async () => {
        // This call is expected to fail with HttpError(404) because the
        // namespace is (probabilistically) not present.
        await api.functional.shoppingMall.configs.byNamespace.at(
          unauthConnection,
          { namespace },
        );
      },
    );
  }
}
