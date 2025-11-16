import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRoleAssignment";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * List active role assignments for a platform administrator with filtering.
 *
 * Business goal
 *
 * - Verify that an authenticated platform administrator can use PATCH
 *   /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/roleAssignments
 *   with `active_only` set to true to retrieve only active role assignments for
 *   a specific platform admin.
 * - Confirm that all returned assignments are scoped to the requested platform
 *   administrator and that pagination metadata is self-consistent.
 *
 * Scenario (adapted to available APIs)
 *
 * 1. Register a new platform administrator (admin) using POST
 *    /auth/platformAdmin/join, obtaining an authorized session.
 * 2. While authenticated as that admin, create an admin role definition using POST
 *    /shoppingMall/platformAdmin/adminRoles. This proves that the platformAdmin
 *    actor can use platform-admin APIs, even though we cannot explicitly assign
 *    that role with the provided functions.
 * 3. Call PATCH
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/roleAssignments
 *    for the created admin, passing an
 *    IShoppingMallAdminRoleAssignment.IRequest body that sets `active_only` to
 *    true and includes reasonable pagination and ordering parameters.
 * 4. Assert that the response is structurally valid and that:
 *
 *    - Every assignment in `data` has `is_active === true`.
 *    - Every assignment in `data` has `platform_admin.id` equal to the requested
 *         platform admin id.
 *    - Pagination metadata is consistent enough to trust the page (e.g., limit >=
 *         data.length, records >= data.length, pages >= 0).
 * 5. We do not assert the presence of revoked assignments or explicit expiration
 *    behavior because there is no public API in this test scope to create or
 *    revoke assignments. We only validate the behavior of `active_only` for
 *    whatever assignments may exist.
 */
export async function test_api_platform_admin_role_assignments_list_active_only(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (admin) and obtain an
  //    authorized session.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create an admin role definition while authenticated as this admin.
  const roleBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      { body: roleBody },
    );
  typia.assert(createdRole);

  // 3. Call roleAssignments.index with active_only = true for this admin.
  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    active_only: true,
    order_by: "assigned_at",
    order_direction: "desc" as "desc",
  } satisfies IShoppingMallAdminRoleAssignment.IRequest;

  const page: IPageIShoppingMallAdminRoleAssignment.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.index(
      connection,
      {
        platformAdminId: admin.id,
        body: requestBody,
      },
    );
  typia.assert(page);

  const { pagination, data } = page;

  // 4. Validate active-only semantics and scoping when there are results.
  if (data.length > 0) {
    for (const assignment of data) {
      // All assignments must belong to the requested platform admin.
      TestValidator.equals(
        "assignment scoped to requested platform admin",
        assignment.platform_admin.id,
        admin.id,
      );

      // active_only=true should only return assignments where is_active is
      // true.
      TestValidator.equals(
        "assignment is_active must be true when active_only is set",
        assignment.is_active,
        true,
      );
    }
  }

  // 5. Basic pagination consistency checks.
  TestValidator.predicate(
    "pagination.current must be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit must be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records must be >= number of returned assignments",
    pagination.records >= data.length,
  );
  TestValidator.predicate(
    "pagination.pages must be non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page limit must be >= data length",
    pagination.limit >= data.length,
  );
}
