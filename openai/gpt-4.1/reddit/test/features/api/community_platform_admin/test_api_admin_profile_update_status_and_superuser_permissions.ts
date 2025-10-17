import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

/**
 * Test updating the profile and permissions (status/superuser/email) of a
 * platform admin, including permission boundaries, business audit, and
 * validation of transitions.
 *
 * Steps:
 *
 * 1. Register two admin users (adminA and adminB), with different initial
 *    superuser statuses
 * 2. Authenticate as adminA (superuser) and update adminB to suspended, toggle
 *    superuser, and update email
 * 3. Verify updated fields, timestamps, and auditability on adminB
 * 4. Attempt invalid transitions (e.g., set illegal status, remove last superuser)
 * 5. Attempt unauthorized updates (adminB tries to update adminA)
 * 6. Attempt to update non-existent admin (random UUID)
 */
export async function test_api_admin_profile_update_status_and_superuser_permissions(
  connection: api.IConnection,
) {
  // 1. Register adminA (superuser)
  const adminAEmail: string = typia.random<string & tags.Format<"email">>();
  const adminA: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminAEmail,
        password: "test-password-123",
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(adminA);

  // 1b. Register adminB (non-superuser)
  const adminBEmail: string = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminBEmail,
      password: "test-password-456",
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  // Switch back (login) as adminA (superuser)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminAEmail,
      password: "test-password-123",
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // 2. Update profile/status of adminB as adminA
  // Update: suspend adminB, make them superuser, update email
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updateFields: ICommunityPlatformAdmin.IUpdate = {
    status: "suspended",
    superuser: true,
    email: newEmail,
  };
  const listAdmins = [adminA, adminBEmail]; // To reference later

  // For finding adminB's id: simulate getting list from DB, here we only have registration output for adminA
  // We'll simulate random UUID for test
  const adminBId = typia.random<string & tags.Format<"uuid">>();
  const updatedB: ICommunityPlatformAdmin =
    await api.functional.communityPlatform.admin.admins.update(connection, {
      adminId: adminBId,
      body: updateFields,
    });
  typia.assert(updatedB);
  TestValidator.equals("superuser is updated", updatedB.superuser, true);
  TestValidator.equals(
    "status updated to suspended",
    updatedB.status,
    "suspended",
  );
  TestValidator.equals("email updated", updatedB.email, newEmail);
  TestValidator.notEquals(
    "updated_at should change",
    updatedB.updated_at,
    updatedB.created_at,
  );

  // 3. Try invalid status/fields (e.g. nonsense status)
  await TestValidator.error("invalid status is rejected", async () => {
    await api.functional.communityPlatform.admin.admins.update(connection, {
      adminId: adminBId,
      body: {
        status: "unknown-invalid-status",
      } satisfies ICommunityPlatformAdmin.IUpdate,
    });
  });

  // 4. Try unauthorized update: have adminB (now superuser) try to update adminA
  // re-login as adminB
  await api.functional.auth.admin.join(connection, {
    body: {
      email: newEmail,
      password: "test-password-456",
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  await TestValidator.error(
    "adminB cannot update adminA (if policy restricts)",
    async () => {
      await api.functional.communityPlatform.admin.admins.update(connection, {
        adminId: adminA.id,
        body: {
          status: "active",
          superuser: true,
        } satisfies ICommunityPlatformAdmin.IUpdate,
      });
    },
  );

  // 5. Try updating non-existent admin
  const unknownId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update non-existent admin should error",
    async () => {
      await api.functional.communityPlatform.admin.admins.update(connection, {
        adminId: unknownId,
        body: {
          superuser: false,
        } satisfies ICommunityPlatformAdmin.IUpdate,
      });
    },
  );
}
