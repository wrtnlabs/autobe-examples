import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

export async function test_api_customer_join_email_uniqueness_enforced(
  connection: api.IConnection,
) {
  // 1. Perform initial successful join with random but valid data
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const firstJoinBody = {
    email,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    // ip is optional and can be omitted or set to null; we choose null explicitly
    ip: null,
    href: "https://shop.example.com/register",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const firstAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: firstJoinBody,
    });
  // Deep structural and format validation
  typia.assert<IShoppingMallCustomer.IAuthorized>(firstAuthorized);

  // Basic business assertions about the successful authorization
  TestValidator.predicate(
    "authorized id must be a non-empty string",
    typeof firstAuthorized.id === "string" && firstAuthorized.id.length > 0,
  );
  TestValidator.equals(
    "authorized email must match joined email",
    firstAuthorized.email,
    email,
  );
  TestValidator.equals(
    "authorized name must match joined name",
    firstAuthorized.name,
    firstJoinBody.name,
  );
  TestValidator.predicate(
    "token access and refresh must be non-empty strings",
    typeof firstAuthorized.token.access === "string" &&
      firstAuthorized.token.access.length > 0 &&
      typeof firstAuthorized.token.refresh === "string" &&
      firstAuthorized.token.refresh.length > 0,
  );
  TestValidator.equals(
    "customer summary id must equal envelope id",
    firstAuthorized.customer.id,
    firstAuthorized.id,
  );

  // 2. Attempt to join again with the SAME email but different password/name
  const secondJoinBody = {
    email,
    password: RandomGenerator.alphaNumeric(18),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/register/again",
    referrer: "https://shop.example.com/promo",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  // 3. Expect a 4xx HTTP error due to email uniqueness violation
  // We accept any 4xx code (400-499) as a valid client error and do not
  // depend on a specific status like 409 to avoid over-specifying behavior.
  await TestValidator.httpError(
    "second join with duplicate email must fail with 4xx client error",
    [400, 401, 403, 404, 409, 422, 429],
    async () =>
      await api.functional.auth.customer.join(connection, {
        body: secondJoinBody,
      }),
  );

  // 4. Confirm no second successful authorization object was produced
  // This is implied by the httpError expectation above: if the call
  // succeeded and returned IShoppingMallCustomer.IAuthorized, the
  // validator would fail the test. Therefore, from the API contract
  // perspective, only the first successful authorization envelope exists.
}
