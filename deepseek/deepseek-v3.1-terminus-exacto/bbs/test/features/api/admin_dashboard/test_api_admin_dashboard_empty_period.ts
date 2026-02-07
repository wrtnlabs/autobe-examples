import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_dashboard_empty_period(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_password_123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(auth);
  // Set date range to historical period before platform existence
  const requestStartDate = new Date("2020-01-01T00:00:00.000Z").toISOString();
  const requestEndDate = new Date("2020-01-31T23:59:59.999Z").toISOString();
  // Access dashboard with empty data period
  const dashboard = await api.functional.discussionBoard.admin.dashboard.index(
    adminConnection,
    {
      body: {
        start_date: requestStartDate,
        end_date: requestEndDate,
        include_user_stats: true,
        include_content_stats: true,
        include_performance_stats: true,
        aggregation_level: undefined,
      } satisfies IDiscussionBoardSuperAdmin.IRequest,
    },
  );
  typia.assert(dashboard);
  // Validate response structure contains all required properties
  TestValidator.predicate(
    "dashboard response contains essential admin properties",
    dashboard.hasOwnProperty("id") &&
      dashboard.hasOwnProperty("email") &&
      dashboard.hasOwnProperty("privilege_level") &&
      dashboard.hasOwnProperty("created_at") &&
      dashboard.hasOwnProperty("updated_at") &&
      dashboard.hasOwnProperty("deleted_at"),
  );
  // Verify timestamps are properly formatted
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    !isNaN(Date.parse(dashboard.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    !isNaN(Date.parse(dashboard.updated_at)),
  );
  // Validate entity identifier format
  TestValidator.predicate(
    "admin ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      dashboard.id,
    ),
  );
  // Verify email complies with standard format
  TestValidator.predicate(
    "email is properly formatted",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dashboard.email),
  );
  // Validate privilege categorization
  TestValidator.predicate(
    "privilege_level is non-empty string",
    dashboard.privilege_level.length > 0,
  );
  // Validate optional timestamp field
  if (dashboard.deleted_at !== null) {
    TestValidator.predicate(
      "when present, deleted_at is valid ISO datetime",
      !isNaN(Date.parse(dashboard.deleted_at)),
    );
  }
}
