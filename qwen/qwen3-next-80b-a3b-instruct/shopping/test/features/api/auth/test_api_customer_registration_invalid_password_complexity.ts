import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_customer_registration_invalid_password_complexity(
  connection: api.IConnection,
): Promise<void> {
  // Create temporary connection for unauthenticated signup
  const guestConnection: api.IConnection = { host: connection.host };
  // Test 1: Password shorter than 8 characters
  await TestValidator.error(
    "registration should fail with password shorter than 8 characters",
    async () => {
      await authorize_customer_join(guestConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "short", // 5 characters - below minimum 8
          href: "https://example.com/register",
          referrer: "https://example.com/home",
        } satisfies IShoppingMallCustomer.IJoin,
      });
    },
  );
  // Test 2: Password missing uppercase letter
  await TestValidator.error(
    "registration should fail with password missing uppercase letter",
    async () => {
      await authorize_customer_join(guestConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "password123", // lowercase + digits, no uppercase
          href: "https://example.com/register",
          referrer: "https://example.com/home",
        } satisfies IShoppingMallCustomer.IJoin,
      });
    },
  );
  // Test 3: Password missing lowercase letter
  await TestValidator.error(
    "registration should fail with password missing lowercase letter",
    async () => {
      await authorize_customer_join(guestConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "PASSWORD123", // uppercase + digits, no lowercase
          href: "https://example.com/register",
          referrer: "https://example.com/home",
        } satisfies IShoppingMallCustomer.IJoin,
      });
    },
  );
  // Test 4: Password missing digit
  await TestValidator.error(
    "registration should fail with password missing digit",
    async () => {
      await authorize_customer_join(guestConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "PasswordABC", // letters only, no digits
          href: "https://example.com/register",
          referrer: "https://example.com/home",
        } satisfies IShoppingMallCustomer.IJoin,
      });
    },
  );
  // Test 5: Password missing symbol
  await TestValidator.error(
    "registration should fail with password missing symbol",
    async () => {
      await authorize_customer_join(guestConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "Password123", // letters + digits, no symbol
          href: "https://example.com/register",
          referrer: "https://example.com/home",
        } satisfies IShoppingMallCustomer.IJoin,
      });
    },
  );
}
