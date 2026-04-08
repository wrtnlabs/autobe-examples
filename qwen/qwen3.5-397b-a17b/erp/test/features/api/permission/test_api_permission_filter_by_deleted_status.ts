import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformPermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering permissions by soft-delete status to verify active and deleted permission separation.
 *
 * Validates the complete permission filtering workflow including member authentication, active permission retrieval, deleted permission retrieval, and default behavior verification. Ensures that the soft-delete filtering logic correctly separates active and deleted permissions.
 *
 * Special attention is given to verifying that active and deleted permission sets are mutually exclusive with no overlapping IDs, and that omitting the deleted parameter defaults to returning only active permissions.
 *
 * 1. Member registers and authenticates to access permission catalog.
 * 2. Request active permissions with deleted=false filter.
 * 3. Request soft-deleted permissions with deleted=true filter.
 * 4. Request permissions with deleted omitted to verify default behavior.
 * 5. Validate that active and deleted sets have no overlapping IDs.
 * 6. Validate that default results match active permission results.
 */
export async function test_api_permission_filter_by_deleted_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Get active permissions (deleted=false)
  const activePermissions =
    await api.functional.hrmPlatform.member.permissions.index(
      memberConnection,
      {
        body: {
          deleted: false,
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformPermission.IRequest,
      },
    );
  typia.assert(activePermissions);
  // 3. Get soft-deleted permissions (deleted=true)
  const deletedPermissions =
    await api.functional.hrmPlatform.member.permissions.index(
      memberConnection,
      {
        body: {
          deleted: true,
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformPermission.IRequest,
      },
    );
  typia.assert(deletedPermissions);
  // 4. Get default permissions (deleted omitted)
  const defaultPermissions =
    await api.functional.hrmPlatform.member.permissions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformPermission.IRequest,
      },
    );
  typia.assert(defaultPermissions);
  // 5. Validate active and deleted sets are mutually exclusive
  const activeIds = new Set(activePermissions.data.map((p) => p.id));
  const deletedIds = new Set(deletedPermissions.data.map((p) => p.id));
  TestValidator.predicate(
    "active and deleted permissions are mutually exclusive",
    () => {
      for (const id of activeIds) {
        if (deletedIds.has(id)) {
          return false;
        }
      }
      return true;
    },
  );
  // 6. Validate default behavior matches active permissions
  TestValidator.equals(
    "default permissions match active permissions",
    defaultPermissions.data.map((p) => p.id).sort(),
    activePermissions.data.map((p) => p.id).sort(),
  );
  // 7. Validate pagination metadata
  TestValidator.predicate("active pagination valid", () => {
    return (
      activePermissions.pagination.current >= 1 &&
      activePermissions.pagination.limit >= 1 &&
      activePermissions.pagination.records >= 0 &&
      activePermissions.pagination.pages >= 0
    );
  });
  TestValidator.predicate("deleted pagination valid", () => {
    return (
      deletedPermissions.pagination.current >= 1 &&
      deletedPermissions.pagination.limit >= 1 &&
      deletedPermissions.pagination.records >= 0 &&
      deletedPermissions.pagination.pages >= 0
    );
  });
}
