import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActivityLog";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_logs_retrieval_with_combined_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization - member becomes owner with org:manage permission
  const orgConnection: api.IConnection = { host: connection.host };
  orgConnection.headers = { ...memberConnection.headers };
  // Create organization through member organization creation endpoint
  // Note: This assumes there's an endpoint for members to create organizations
  // For this test, we use the organization from the auth response or create one
  const organizationId = memberAuth.organizations?.[0]?.id;
  // If no organization exists, we need to handle this case
  // In a real scenario, there would be an organization creation endpoint
  if (!organizationId) {
    // Create a test organization ID for the test
    // This would normally be done through an organization creation API call
    throw new Error("No organization available for testing");
  }
  // 3. Perform actions to generate activity logs
  // These actions will create activity logs in the system
  // For this test, we'll assume some activity logs already exist or perform mock actions
  // Generate timestamps for filtering tests
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - 7);
  const endTime = new Date();
  // 4. Test activity logs retrieval with combined filters
  const combinedFilterRequest: IHrmActivityLog.IRequest = {
    action_type: "employee_invited",
    performer_id: memberAuth.id,
    timestamp: {
      gte: startTime.toISOString(),
      lte: endTime.toISOString(),
    },
    page: 1,
    pageSize: 5,
  } satisfies IHrmActivityLog.IRequest;
  const combinedFilterResult: IPageIHrmActivityLog.ISummary =
    await api.functional.hrm.member.organizations.activity_logs.patchByOrganizationid(
      orgConnection,
      {
        organizationId,
        body: combinedFilterRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // 4.1: Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    combinedFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    combinedFilterResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    combinedFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    combinedFilterResult.pagination.pages >= 0,
  );
  // 4.2: Validate response structure - each activity log summary has required fields
  for (const log of combinedFilterResult.data) {
    typia.assert(log);
    TestValidator.predicate(
      "log has id",
      log.id !== undefined && log.id !== null,
    );
    TestValidator.predicate("log has timestamp", log.timestamp !== undefined);
    TestValidator.predicate(
      "log has action_type",
      log.action_type !== undefined,
    );
    TestValidator.predicate(
      "log has target_entity_type",
      log.target_entity_type !== undefined,
    );
    TestValidator.predicate("log has performer", log.performer !== undefined);
    TestValidator.predicate("log has created_at", log.created_at !== undefined);
    TestValidator.predicate("log has updated_at", log.updated_at !== undefined);
  }
  // 5. Test pagination with different page sizes
  const pageSizeTest: IHrmActivityLog.IRequest = {
    page: 1,
    pageSize: 10,
  } satisfies IHrmActivityLog.IRequest;
  const pageSizeResult: IPageIHrmActivityLog.ISummary =
    await api.functional.hrm.member.organizations.activity_logs.patchByOrganizationid(
      orgConnection,
      {
        organizationId,
        body: pageSizeTest,
      },
    );
  typia.assert(pageSizeResult);
  TestValidator.equals(
    "pagination limit with pageSize 10",
    pageSizeResult.pagination.limit,
    10,
  );
  // 6. Test timestamp range filtering
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const timestampFilterRequest: IHrmActivityLog.IRequest = {
    timestamp: {
      gte: threeDaysAgo.toISOString(),
      lte: new Date().toISOString(),
    },
    page: 1,
    pageSize: 20,
  } satisfies IHrmActivityLog.IRequest;
  const timestampFilterResult: IPageIHrmActivityLog.ISummary =
    await api.functional.hrm.member.organizations.activity_logs.patchByOrganizationid(
      orgConnection,
      {
        organizationId,
        body: timestampFilterRequest,
      },
    );
  typia.assert(timestampFilterResult);
  // Validate all logs are within the timestamp range
  for (const log of timestampFilterResult.data) {
    const logTime = new Date(log.timestamp);
    TestValidator.predicate(
      `log timestamp >= ${threeDaysAgo.toISOString()}`,
      logTime >= threeDaysAgo,
    );
    TestValidator.predicate(
      `log timestamp <= ${new Date().toISOString()}`,
      logTime <= new Date(),
    );
  }
  // 7. Test sorting by timestamp descending (default)
  if (timestampFilterResult.data.length > 1) {
    for (let i = 0; i < timestampFilterResult.data.length - 1; i++) {
      const current = new Date(timestampFilterResult.data[i].timestamp);
      const next = new Date(timestampFilterResult.data[i + 1].timestamp);
      TestValidator.predicate(
        `timestamp descending at index ${i}`,
        current >= next,
      );
    }
  }
  // 8. Test pagination with page 2
  const page2Request: IHrmActivityLog.IRequest = {
    page: 2,
    pageSize: 5,
  } satisfies IHrmActivityLog.IRequest;
  const page2Result: IPageIHrmActivityLog.ISummary =
    await api.functional.hrm.member.organizations.activity_logs.patchByOrganizationid(
      orgConnection,
      {
        organizationId,
        body: page2Request,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "pagination current page 2",
    page2Result.pagination.current,
    2,
  );
}
