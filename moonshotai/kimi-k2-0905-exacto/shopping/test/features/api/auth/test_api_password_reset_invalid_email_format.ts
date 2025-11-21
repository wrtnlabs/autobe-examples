import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPasswordReset";

/**
 * Test password reset with invalid email format to validate email validation
 * rules.
 *
 * This test validates that the API properly rejects password reset requests
 * with malformed email addresses including:
 *
 * 1. Missing @ symbol (e.g., "userexample.com")
 * 2. Invalid domain formats (e.g., "user@", "user"@)
 * 3. Special characters in wrong positions
 * 4. Incomplete or malformed email addresses
 *
 * The test ensures the system maintains proper input validation to prevent
 * abuse and provides appropriate error handling for user input mistakes.
 */
export async function test_api_password_reset_invalid_email_format(
  connection: api.IConnection,
) {
  // Test 1: Missing @ symbol
  await TestValidator.error(
    "password reset should fail with missing @ symbol",
    async () => {
      await api.functional.shoppingMall.auth.password.reset.requestReset(
        connection,
        {
          body: {
            email: "userexample.com",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IShoppingMallPasswordReset.ICreate,
        },
      );
    },
  );

  // Test 2: Missing domain part
  await TestValidator.error(
    "password reset should fail with missing domain",
    async () => {
      await api.functional.shoppingMall.auth.password.reset.requestReset(
        connection,
        {
          body: {
            email: "user@",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IShoppingMallPasswordReset.ICreate,
        },
      );
    },
  );

  // Test 3: Missing local part
  await TestValidator.error(
    "password reset should fail with missing local part",
    async () => {
      await api.functional.shoppingMall.auth.password.reset.requestReset(
        connection,
        {
          body: {
            email: "@",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IShoppingMallPasswordReset.ICreate,
        },
      );
    },
  );

  // Test 4: Invalid characters in domain
  await TestValidator.error(
    "password reset should fail with invalid domain characters",
    async () => {
      await api.functional.shoppingMall.auth.password.reset.requestReset(
        connection,
        {
          body: {
            email: "user@exam ple.com",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IShoppingMallPasswordReset.ICreate,
        },
      );
    },
  );

  // Test 5: Multiple @ symbols
  await TestValidator.error(
    "password reset should fail with multiple @ symbols",
    async () => {
      await api.functional.shoppingMall.auth.password.reset.requestReset(
        connection,
        {
          body: {
            email: "user@@example.com",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IShoppingMallPasswordReset.ICreate,
        },
      );
    },
  );

  // Test 6: No top-level domain
  await TestValidator.error(
    "password reset should fail without top-level domain",
    async () => {
      await api.functional.shoppingMall.auth.password.reset.requestReset(
        connection,
        {
          body: {
            email: "user@example",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IShoppingMallPasswordReset.ICreate,
        },
      );
    },
  );

  // Test 7: Invalid top-level domain
  await TestValidator.error(
    "password reset should fail with invalid top-level domain",
    async () => {
      await api.functional.shoppingMall.auth.password.reset.requestReset(
        connection,
        {
          body: {
            email: "user@example.123",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IShoppingMallPasswordReset.ICreate,
        },
      );
    },
  );

  // Test 8: Empty email
  await TestValidator.error(
    "password reset should fail with empty email",
    async () => {
      await api.functional.shoppingMall.auth.password.reset.requestReset(
        connection,
        {
          body: {
            email: "",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IShoppingMallPasswordReset.ICreate,
        },
      );
    },
  );

  // Test 9: Spaces in email
  await TestValidator.error(
    "password reset should fail with spaces in email",
    async () => {
      await api.functional.shoppingMall.auth.password.reset.requestReset(
        connection,
        {
          body: {
            email: "user @example.com",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IShoppingMallPasswordReset.ICreate,
        },
      );
    },
  );

  // Test 10: Special characters at wrong positions
  await TestValidator.error(
    "password reset should fail with special characters in wrong positions",
    async () => {
      await api.functional.shoppingMall.auth.password.reset.requestReset(
        connection,
        {
          body: {
            email: "#.com@",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IShoppingMallPasswordReset.ICreate,
        },
      );
    },
  );

  // Verify that a valid email format should succeed
  const validResetData = {
    email: typia.random<string & tags.Format<"email">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPasswordReset.ICreate;

  const validResponse =
    await api.functional.shoppingMall.auth.password.reset.requestReset(
      connection,
      {
        body: validResetData,
      },
    );
  typia.assert(validResponse);
  TestValidator.equals(
    "valid email reset should have email field",
    validResponse.email,
    validResetData.email,
  );
}
