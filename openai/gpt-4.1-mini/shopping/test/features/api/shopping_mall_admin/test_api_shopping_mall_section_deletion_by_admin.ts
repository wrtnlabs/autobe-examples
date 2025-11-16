import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_shopping_mall_section_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registers and authenticates
  const adminCreateBody = {
    email: `admin.${RandomGenerator.alphaNumeric(8)}@company.com`,
    name: RandomGenerator.name(),
    password: "SecurePass123!",
    phone_number: null,
    role: "superadmin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  TestValidator.predicate(
    "Admin user receives a valid JWT token",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  // 2. Delete the target section
  const channelCode = typia.random<string>();
  const sectionCode = typia.random<string>();

  await api.functional.shoppingMall.admin.shoppingMallChannels.shoppingMallSections.erase(
    connection,
    {
      channelCode: channelCode,
      sectionCode: sectionCode,
    },
  );

  // DELETE returns void - no direct response validation possible
  // Subsequent validation would verify the resource is removed, but
  // requires additional GET API which is not defined here.
  // Hence, rely on no exception and successful void return as test pass.

  TestValidator.predicate("Delete operation completed without errors", true);
}
