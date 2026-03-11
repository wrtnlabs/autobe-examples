import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequestDecision";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the basic search functionality for administrator request decisions without any filters.
 * Verify that a super administrator can retrieve a paginated list of all decision records
 * with proper pagination metadata.
 */
export async function test_api_admin_request_decisions_search_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create search request with minimal pagination parameters
  const searchRequest: IDiscussionBoardAdminRequestDecision.IRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1> as number,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> as number,
  };
  // 3. Call the admin request decisions search endpoint
  const response =
    await api.functional.discussionBoard.superAdmin.admin_request_decisions.index(
      superAdminConnection,
      {
        body: searchRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata business logic
  TestValidator.predicate(
    "current page matches request",
    response.pagination.current === searchRequest.page,
  );
  TestValidator.predicate(
    "limit matches request",
    response.pagination.limit === searchRequest.limit,
  );
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages calculation is correct",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit) ||
      (response.pagination.records === 0 && response.pagination.pages === 0),
  );
  // 5. Validate data array length consistency
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= searchRequest.limit,
  );
  // 6. Validate decision summaries business logic if data exists
  if (response.data.length > 0) {
    const decision = response.data[0];
    // Validate decision outcome is valid
    TestValidator.predicate(
      "decision outcome is approved or rejected",
      decision.decision === "approved" || decision.decision === "rejected",
    );
    // Validate timestamp format
    TestValidator.predicate(
      "created_at is valid ISO string",
      !isNaN(new Date(decision.created_at).getTime()),
    );
    // Validate relationship consistency
    TestValidator.predicate(
      "admin request has valid id",
      typeof decision.admin_request.id === "string" &&
        decision.admin_request.id.length > 0,
    );
    TestValidator.predicate(
      "super admin has valid id",
      typeof decision.super_admin.id === "string" &&
        decision.super_admin.id.length > 0,
    );
  }
}
