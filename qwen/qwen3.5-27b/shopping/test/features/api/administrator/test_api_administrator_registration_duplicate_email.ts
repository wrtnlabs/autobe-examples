import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator registration failure when email already exists.
 *
 * Validates that the system correctly prevents duplicate administrator registrations by rejecting attempts to register with an email that already exists in the system. The first registration succeeds, and the second registration with the same email fails with a 409 Conflict error.
 *
 * This test ensures email uniqueness is enforced at the application level and that appropriate error responses are returned to clients attempting duplicate registrations.
 *
 * 1. Register a new administrator with a unique email address.
 * 2. Verify the first registration succeeds and returns valid authorization tokens.
 * 3. Attempt to register a second administrator with the same email address.
 * 4. Verify the second registration fails with HTTP 409 Conflict status.
 */
export async function test_api_administrator_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. First administrator registration (should succeed)
  const firstConnection: api.IConnection = { host: connection.host };
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstAdmin = await authorize_administrator_join(firstConnection, {
    body: {
      email: firstEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(firstAdmin);
  // 2. Second registration attempt with duplicate email (should fail with 409)
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate email registration fails with 409",
    409,
    async () =>
      await authorize_administrator_join(secondConnection, {
        body: {
          email: firstEmail,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IShoppingMallAdministrator.IJoin,
      }),
  );
}
