import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_invalid_password_complexity(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Test password that is too short (11 characters)
  const shortPasswordBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ShortPass1!", // 11 characters - violates minimum 12
  } satisfies IShoppingMallAdmin.IJoin;
  // Validate password complexity rejection with 400 Bad Request
  await TestValidator.httpError("password too short", 400, async () => {
    await authorize_admin_join(adminConnection, { body: shortPasswordBody });
  });
  // Test password missing uppercase letter
  const noUppercaseBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "shortpass1!", // 11 characters, missing uppercase
  } satisfies IShoppingMallAdmin.IJoin;
  // Validate rejection due to missing uppercase
  await TestValidator.httpError("missing uppercase letter", 400, async () => {
    await authorize_admin_join(adminConnection, { body: noUppercaseBody });
  });
  // Test password missing digit
  const noDigitBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "shortpass!", // 10 characters, missing digit
  } satisfies IShoppingMallAdmin.IJoin;
  // Validate rejection due to missing digit
  await TestValidator.httpError("missing digit", 400, async () => {
    await authorize_admin_join(adminConnection, { body: noDigitBody });
  });
  // Test password missing special character
  const noSpecialBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "shortpass1", // 10 characters, missing special character
  } satisfies IShoppingMallAdmin.IJoin;
  // Validate rejection due to missing special character
  await TestValidator.httpError("missing special character", 400, async () => {
    await authorize_admin_join(adminConnection, { body: noSpecialBody });
  });
  // Test password with all requirements met (valid case for contrast)
  const validPasswordBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPass123!", // 13 characters, has uppercase, lowercase, digit, special
  } satisfies IShoppingMallAdmin.IJoin;
  // Ensure valid password works and returns authorized response
  const authorized = await authorize_admin_join(adminConnection, {
    body: validPasswordBody,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "access token exists",
    typeof authorized.access,
    "string",
  );
  TestValidator.equals(
    "refresh token exists",
    typeof authorized.refresh,
    "string",
  );
  TestValidator.equals(
    "token object exists",
    typeof authorized.token,
    "object",
  );
  // Ensure we can still trigger invalid password with the same connection
  const anotherInvalidBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234567890", // 10 characters, missing letters and special
  } satisfies IShoppingMallAdmin.IJoin;
  // Ensure another invalid password attempt still fails
  await TestValidator.httpError(
    "password insufficient complexity",
    400,
    async () => {
      await authorize_admin_join(adminConnection, { body: anotherInvalidBody });
    },
  );
}
