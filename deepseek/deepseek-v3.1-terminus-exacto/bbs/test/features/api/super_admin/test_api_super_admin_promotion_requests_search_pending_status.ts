import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test searching for pending promotion requests with date range filtering.
 * A super administrator searches for pending promotion requests created within
 * the last 7 days to review recent submissions.
 */
export async function test_api_super_admin_promotion_requests_search_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Set up date range for last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // Search for pending promotion requests within date range
  const searchResult =
    await api.functional.discussionBoard.superAdmin.promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending" as const,
          created_at_start: sevenDaysAgo.toISOString(),
          created_at_end: now.toISOString(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IRequest,
      },
    );
  typia.assert(searchResult);
  // Verify each request has pending status and falls within date range
  for (const request of searchResult.data) {
    typia.assert(request);
    // Verify status is pending
    TestValidator.equals(
      "request status is pending",
      request.status,
      "pending",
    );
    // Verify creation date falls within specified range
    const createdAt = new Date(request.created_at);
    TestValidator.predicate(
      "created at is after start date",
      createdAt >= sevenDaysAgo,
    );
    TestValidator.predicate("created at is before end date", createdAt <= now);
    // Verify reviewer is null for pending requests
    TestValidator.equals(
      "reviewer is null for pending request",
      request.reviewer,
      null,
    );
    // Verify approved_at and rejected_at are null for pending requests
    TestValidator.equals("approved_at is null", request.approved_at, null);
    TestValidator.equals("rejected_at is null", request.rejected_at, null);
  }
}
