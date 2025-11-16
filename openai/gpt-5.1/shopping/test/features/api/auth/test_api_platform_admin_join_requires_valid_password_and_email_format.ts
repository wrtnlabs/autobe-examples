import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_join_requires_valid_password_and_email_format(
  connection: api.IConnection,
) {
  // 1. Perform an initial successful platform admin join with valid data
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const password: string = RandomGenerator.alphaNumeric(16);

  const firstRequestBody = {
    email,
    name: RandomGenerator.name(),
    password,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const firstAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: firstRequestBody,
    });

  // Validate the authorized admin response structure
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(firstAuthorized);

  // Basic business validations on the response
  TestValidator.equals(
    "joined admin email should match request email",
    firstAuthorized.email,
    email,
  );

  TestValidator.predicate(
    "joined admin should be active",
    firstAuthorized.isActive === true,
  );

  TestValidator.predicate(
    "joined admin should have non-empty access token",
    firstAuthorized.token.access.length > 0,
  );

  TestValidator.predicate(
    "joined admin should have non-empty refresh token",
    firstAuthorized.token.refresh.length > 0,
  );

  // 2. Attempt to join again with the same email, expecting a business error
  const secondRequestBody = {
    email, // duplicate email
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  await TestValidator.error(
    "duplicate platform admin email join should be rejected",
    async () => {
      await api.functional.auth.platformAdmin.join(connection, {
        body: secondRequestBody,
      });
    },
  );
}
