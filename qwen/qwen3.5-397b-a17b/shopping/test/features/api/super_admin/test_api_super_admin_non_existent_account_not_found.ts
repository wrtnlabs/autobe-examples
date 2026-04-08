import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that retrieving a non-existent super administrator account returns 404 Not Found.
 *
 * Validates the error handling behavior when attempting to access a super administrator account that does not exist in the system. The test ensures that the API properly returns a 404 Not Found response instead of exposing system information or returning unexpected data.
 *
 * The test establishes an authenticated super administrator context to ensure the request has proper authorization, then attempts to retrieve a profile using a randomly generated UUID that is guaranteed not to correspond to any existing account.
 *
 * 1. Register a super administrator account using authorize_super_admin_join utility to establish authentication context.
 * 2. Generate a random UUID that does not correspond to any existing super administrator account.
 * 3. Attempt to retrieve a profile using this non-existent UUID via the super_admins.at endpoint.
 * 4. Validate the API call throws HttpError with status code 404 using TestValidator.httpError.
 */
export async function test_api_super_admin_non_existent_account_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator to establish authentication context
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // 2. Generate a random UUID that does not exist
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3 & 4. Attempt to retrieve non-existent super admin and validate 404 response
  await TestValidator.httpError(
    "non-existent super admin returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.superAdmin.super_admins.at(
        superAdminConnection,
        {
          superAdminId: nonExistentId,
        },
      );
    },
  );
}
