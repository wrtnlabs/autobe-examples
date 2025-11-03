import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_join(connection: api.IConnection) {
  // Generate random and valid registration details
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // 12 character alphanumeric
  const nickname = RandomGenerator.name();

  // Prepare the request body
  const requestBody = {
    email,
    password,
    nickname,
  } satisfies IShoppingMallCustomer.ICreate;

  // Call the join endpoint to create a new customer
  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: requestBody,
    });

  // Assert the returned authorized customer data
  typia.assert(authorized);

  // Validate main properties
  TestValidator.predicate(
    "Returned customer id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );

  TestValidator.equals("Returned email matches input", authorized.email, email);
  TestValidator.predicate(
    "Nickname is non-empty string",
    authorized.nickname.length > 0,
  );

  TestValidator.predicate(
    "created_at is ISO 8601 datetime",
    typeof authorized.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z$/.test(
        authorized.created_at,
      ),
  );

  TestValidator.predicate(
    "updated_at is ISO 8601 datetime",
    typeof authorized.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z$/.test(
        authorized.updated_at,
      ),
  );

  // deleted_at must be null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    authorized.deleted_at === null || authorized.deleted_at === undefined,
  );

  // Validate the token structure
  const token: IAuthorizationToken = authorized.token;
  typia.assert(token);

  TestValidator.predicate(
    "token.access is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );

  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  TestValidator.predicate(
    "token.expired_at is ISO 8601 datetime",
    typeof token.expired_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z$/.test(
        token.expired_at,
      ),
  );

  TestValidator.predicate(
    "token.refreshable_until is ISO 8601 datetime",
    typeof token.refreshable_until === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z$/.test(
        token.refreshable_until,
      ),
  );
}
