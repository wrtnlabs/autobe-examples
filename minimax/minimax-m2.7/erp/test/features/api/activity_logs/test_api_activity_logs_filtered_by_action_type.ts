import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_logs_filtered_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account via join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Create a connection with the member\'s authorization token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 2. Define date range for filtering (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const startDateStr = startDate.toISOString();
  const endDateStr = endDate.toISOString();
  // 3. Query activity logs with action type filter and date range
  // Using project_created as the filter action type
  const actionTypeFilter = "project_created";
  const activityLogsResponse =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      authenticatedConnection,
      {
        organizationId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          actionType: actionTypeFilter,
          startDate: startDateStr,
          endDate: endDateStr,
          page: 1,
          limit: 20,
          orderBy: "created_at",
          sortOrder: "desc",
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(activityLogsResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    activityLogsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    activityLogsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    activityLogsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    activityLogsResponse.pagination.pages >= 0,
  );
  // 5. Validate that if there are entries, they all match the action type filter
  if (activityLogsResponse.data.length > 0) {
    for (const entry of activityLogsResponse.data) {
      TestValidator.equals(
        "action_type should match filter",
        entry.action_type,
        actionTypeFilter,
      );
    }
  }
  // 6. Validate entries are within the specified date range
  for (const entry of activityLogsResponse.data) {
    const entryDate = new Date(entry.created_at);
    TestValidator.predicate(
      "entry created_at should be >= startDate",
      entryDate >= startDate,
    );
    TestValidator.predicate(
      "entry created_at should be <= endDate",
      entryDate <= endDate,
    );
  }
  // 7. Validate each entry contains all required fields
  for (const entry of activityLogsResponse.data) {
    TestValidator.predicate(
      "entry should have valid id (UUID format)",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        entry.id,
      ),
    );
    TestValidator.predicate(
      "entry should have action_type",
      entry.action_type.length > 0,
    );
    TestValidator.predicate(
      "entry should have target_entity_type",
      entry.target_entity_type.length > 0,
    );
    TestValidator.predicate(
      "entry should have valid target_entity_id (UUID format)",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        entry.target_entity_id,
      ),
    );
    TestValidator.predicate(
      "entry should have member info",
      entry.member !== null && entry.member !== undefined,
    );
    TestValidator.predicate(
      "entry should have valid created_at (ISO date-time format)",
      !isNaN(Date.parse(entry.created_at)),
    );
  }
  // 8. Validate results are sorted by created_at in descending order (most recent first)
  if (activityLogsResponse.data.length > 1) {
    for (let i = 0; i < activityLogsResponse.data.length - 1; i++) {
      const current = new Date(activityLogsResponse.data[i].created_at);
      const next = new Date(activityLogsResponse.data[i + 1].created_at);
      TestValidator.predicate(
        "entries should be sorted by created_at in descending order",
        current >= next,
      );
    }
  }
}
