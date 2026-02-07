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
 * Test the ability to search and retrieve all promotion approval records as a super administrator.
 * This scenario validates that super administrators can access the complete audit trail of promotion approvals.
 * The test verifies that the endpoint returns a paginated list of approval records with proper metadata
 * including reviewer information, approval status, decision timestamps, and decision reasons.
 */
export async function test_api_promotion_approvals_search_all_records(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Search all promotion approval records with empty request body
  const response =
    await api.functional.discussionBoard.superAdmin.promotion_approvals.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  // Validate response structure - typia.assert performs complete validation
  typia.assert(response);
  // Verify pagination metadata contains valid values
  TestValidator.predicate(
    "pagination current page should be non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count should be non-negative",
    response.pagination.pages >= 0,
  );
  // typia.assert already validates all data array contents including UUID format
  // No need for redundant validation after typia.assert
}
