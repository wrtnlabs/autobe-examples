import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering administrators by grade level.
 * A super administrator searches specifically for regular administrators (non-super administrators).
 * Verify that the response contains only administrators with the regular grade level.
 * Then test searching for super administrators and verify only super administrators are returned.
 * Validate that the filtering logic correctly distinguishes between regular and super administrator grades.
 *
 * Note: The current DTO structure only provides basic ID information in the response,
 * so we can only validate that the endpoint returns a valid response structure.
 * Grade-level filtering validation requires additional properties that are not currently
 * available in the response DTO definitions.
 */
export async function test_api_superadmin_administrators_filter_by_grade(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Call administrators index endpoint with empty request body
  const response =
    await api.functional.discussionBoard.superAdmin.administrators.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  // Validate response structure - typia.assert performs complete validation
  typia.assert(response);
  // Note: The current response DTO (IDiscussionBoardAdministratorPromotionApproval.ISummary)
  // only contains an 'id' field and no grade level information, so we cannot validate
  // grade-based filtering with the current API structure.
  // This test validates that the endpoint is accessible and returns valid data.
}
