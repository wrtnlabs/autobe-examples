import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering by active status flag to validate business logic around status type availability.
 * This scenario should test both active (true) and inactive (false) status type filtering to ensure the system correctly distinguishes between available and unavailable status types. Verify that the is_active field filtering works as expected and that the response only includes status types matching the specified active status. This tests important administrative functionality for managing which status types are available for use across the platform.
 */
export async function test_api_status_types_active_inactive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection for authorization
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Query all status types without filters to get baseline data
  const allStatusTypes =
    await api.functional.discussionBoard.superAdmin.status_types.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardStatusType.IRequest,
      },
    );
  typia.assert(allStatusTypes);
  // 3. Query active status types (isActive: true)
  const activeStatusTypes =
    await api.functional.discussionBoard.superAdmin.status_types.index(
      superAdminConnection,
      {
        body: {
          isActive: true,
        } satisfies IDiscussionBoardStatusType.IRequest,
      },
    );
  typia.assert(activeStatusTypes);
  // Validate all returned active status types have is_active: true
  TestValidator.predicate(
    "all active status types should have is_active: true",
    activeStatusTypes.data.every((statusType) => statusType.is_active === true),
  );
  // 4. Query inactive status types (isActive: false)
  const inactiveStatusTypes =
    await api.functional.discussionBoard.superAdmin.status_types.index(
      superAdminConnection,
      {
        body: {
          isActive: false,
        } satisfies IDiscussionBoardStatusType.IRequest,
      },
    );
  typia.assert(inactiveStatusTypes);
  // Validate all returned inactive status types have is_active: false
  TestValidator.predicate(
    "all inactive status types should have is_active: false",
    inactiveStatusTypes.data.every(
      (statusType) => statusType.is_active === false,
    ),
  );
  // 5. Compare counts to ensure filtering works correctly
  TestValidator.equals(
    "total count should equal sum of active and inactive counts",
    allStatusTypes.pagination.records,
    activeStatusTypes.pagination.records +
      inactiveStatusTypes.pagination.records,
  );
  // Additional validation: Ensure no overlap between active and inactive lists
  const activeIds = new Set(activeStatusTypes.data.map((status) => status.id));
  const inactiveIds = new Set(
    inactiveStatusTypes.data.map((status) => status.id),
  );
  TestValidator.predicate(
    "active and inactive status types should not overlap",
    !Array.from(activeIds).some((id) => inactiveIds.has(id)),
  );
}
