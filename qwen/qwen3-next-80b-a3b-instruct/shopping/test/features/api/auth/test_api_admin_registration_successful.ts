import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_registration_successful(
  connection: api.IConnection,
) {
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(16);
  const firstName: string = RandomGenerator.name();
  const lastName: string = RandomGenerator.name();
  const role: "super_admin" | "full_admin" | "limited_admin" = "super_admin";

  const output: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role,
      } satisfies IShoppingMallAdmin.ICreate,
    });

  typia.assert(output);

  TestValidator.equals(
    "role should be super_admin",
    output.role,
    "super_admin",
  );
  TestValidator.equals(
    "status should be pending_verification",
    output.status,
    "pending_verification",
  );
}
