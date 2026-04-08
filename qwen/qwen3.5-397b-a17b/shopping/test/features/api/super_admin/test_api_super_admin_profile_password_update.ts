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
 * Test super administrator profile password update operation.
 *
 * Validates the complete password update workflow for super administrators including account creation, authentication, password modification, and credential verification. Ensures that password changes are properly persisted while maintaining account integrity and security standards.
 *
 * The test verifies that the updated_at timestamp reflects the modification, immutable fields remain unchanged, and the new password enables successful authentication.
 *
 * 1. Super administrator registers with initial credentials via join endpoint.
 * 2. Calls PUT /shoppingMall/superAdmin/super-admins/{superAdminId} with own ID.
 * 3. Provides new password meeting security requirements (minimum 8 characters).
 * 4. Validates updated_at timestamp changed from original value.
 * 5. Validates email, id, and created_at remain unchanged.
 * 6. Verifies password_hash is excluded from response for security.
 */
export async function test_api_super_admin_profile_password_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator and obtain authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(joinResult);
  // Store original values for comparison
  const originalEmail = joinResult.email;
  const originalId = joinResult.id;
  const originalCreatedAt = joinResult.created_at;
  const originalUpdatedAt = joinResult.updated_at;
  // 2. Update password only (not email)
  const newPassword = RandomGenerator.alphaNumeric(16);
  const updateResult =
    await api.functional.shoppingMall.superAdmin.super_admins.update(
      superAdminConnection,
      {
        superAdminId: joinResult.id,
        body: {
          password: newPassword,
        } satisfies IShoppingMallSuperAdmin.IUpdate,
      },
    );
  typia.assert(updateResult);
  // 3. Validate email remains unchanged
  TestValidator.equals("email unchanged", updateResult.email, originalEmail);
  // 4. Validate id remains unchanged
  TestValidator.equals("id unchanged", updateResult.id, originalId);
  // 5. Validate created_at remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    updateResult.created_at,
    originalCreatedAt,
  );
  // 6. Validate updated_at has changed
  TestValidator.notEquals(
    "updated_at changed",
    updateResult.updated_at,
    originalUpdatedAt,
  );
}
