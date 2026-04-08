import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin profile update workflow with valid display name.
 *
 * Validates the complete admin profile update flow including admin registration,
 * profile modification via PATCH endpoint, and response validation. Ensures that
 * the display name is successfully updated while immutable fields (email, id,
 * created_at) remain unchanged and the updated_at timestamp reflects the
 * modification.
 *
 * 1. Administrator registers via auth/admin/join endpoint.
 * 2. New random display name is generated.
 * 3. PATCH /admin/admins/me is called with the new name.
 * 4. Validates response contains updated name with preserved email.
 * 5. Confirms id and created_at remain unchanged.
 * 6. Verifies updated_at timestamp reflects modification time.
 */
export async function test_api_admin_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const originalAdmin = await authorize_admin_join(adminConnection, {});
  typia.assert(originalAdmin);
  // 2. Generate new display name for update
  const newDisplayName = RandomGenerator.name();
  // 3. Store original values for validation
  const originalId = originalAdmin.id;
  const originalEmail = originalAdmin.email;
  const originalCreatedAt = originalAdmin.created_at;
  // 4. Update profile with new display name
  const updatedAdmin =
    await api.functional.ecommerceMall.admin.admins.me.update(adminConnection, {
      body: {
        name: newDisplayName,
      } satisfies IEcommerceMallAdmin.IUpdate,
    });
  typia.assert(updatedAdmin);
  // 5. Validate the response
  TestValidator.equals("new name is set", updatedAdmin.name, newDisplayName);
  TestValidator.equals("email unchanged", updatedAdmin.email, originalEmail);
  TestValidator.equals("id unchanged", updatedAdmin.id, originalId);
  TestValidator.equals(
    "created_at unchanged",
    updatedAdmin.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at reflects modification",
    new Date(updatedAdmin.updated_at) >= new Date(originalCreatedAt),
  );
}
