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

export async function test_api_admin_request_decision_history_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Call the admin request decision history endpoint with basic pagination
  const historyResponse =
    await api.functional.discussionBoard.superAdmin.admin_requests.history.index(
      superAdminConnection,
      {
        body: {
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 20 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IDiscussionBoardAdminRequestDecision.IRequest,
      },
    );
  typia.assert(historyResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    historyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    historyResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    historyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    historyResponse.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(historyResponse.data));
  // Validate each decision summary if data exists
  if (historyResponse.data.length > 0) {
    for (const decision of historyResponse.data) {
      typia.assert(decision);
      // Check decision type using proper validation
      TestValidator.predicate(
        "decision type valid",
        decision.decision === "approved" || decision.decision === "rejected",
      );
      // Check timestamp format using ISO string validation
      TestValidator.predicate(
        "created_at is valid ISO string",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
          decision.created_at,
        ),
      );
      // Validate admin request structure
      typia.assert(decision.admin_request);
      TestValidator.predicate(
        "admin request has valid id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          decision.admin_request.id,
        ),
      );
      TestValidator.predicate(
        "admin request has reason",
        typeof decision.admin_request.reason === "string",
      );
      TestValidator.predicate(
        "admin request has status",
        typeof decision.admin_request.status === "string",
      );
      // Validate super admin structure
      typia.assert(decision.super_admin);
      TestValidator.predicate(
        "super admin has valid id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          decision.super_admin.id,
        ),
      );
      TestValidator.predicate(
        "super admin has email",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decision.super_admin.email),
      );
      TestValidator.predicate(
        "super admin has admin_grade",
        typeof decision.super_admin.admin_grade === "string",
      );
    }
  }
}
