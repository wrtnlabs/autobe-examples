import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_delete_point_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongP@ssw0rd!",
        ip: null,
        href: "https://admin.portal.example.com/join",
        referrer: "https://admin.portal.example.com",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Admin deletes a loyalty point record by its pointId
  // Generate a random pointId UUID
  const pointId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.shoppingMall.admin.points.erase(connection, { pointId });
}
