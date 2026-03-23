import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogChange";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLogChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving field-level changes for an activity log entry with pagination.
 * 1. Authenticate as member
 * 2. Retrieve paginated activity log changes
 * 3. Validate response structure and pagination metadata
 * 4. Verify change record fields
 * 5. Test with different pagination and filter parameters
 */
export async function test_api_activity_log_changes_retrieve_paginated_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Generate a valid activity log ID for testing
  const activityLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve activity log changes with default pagination
  const output1: IPageIHrmPlatformActivityLogChange.ISummary =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId,
        body: {},
      },
    );
  typia.assert(output1);
  // 4. Validate pagination metadata (business logic, not type validation)
  TestValidator.predicate(
    "pagination current page is at least 1",
    output1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    output1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    output1.pagination.pages >= 0,
  );
  // 5. Test with custom pagination parameters
  const output2: IPageIHrmPlatformActivityLogChange.ISummary =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(output2);
  TestValidator.equals(
    "custom page parameter respected",
    output2.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit parameter respected",
    output2.pagination.limit,
    10,
  );
  // 6. Test with filter parameters
  const output3: IPageIHrmPlatformActivityLogChange.ISummary =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId,
        body: {
          field_name: "status",
          field_type: "string",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(output3);
  // Verify filtered results match criteria (business logic validation)
  if (output3.data.length > 0) {
    TestValidator.predicate(
      "filtered results match field_name criteria",
      output3.data.every((change) => change.field_name.includes("status")),
    );
    TestValidator.predicate(
      "filtered results match field_type criteria",
      output3.data.every((change) => change.field_type === "string"),
    );
  }
  // 7. Test with value filters
  const output4: IPageIHrmPlatformActivityLogChange.ISummary =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId,
        body: {
          new_value: "active",
          page: 1,
          limit: 50,
        },
      },
    );
  typia.assert(output4);
  // Verify value-filtered results match criteria (business logic validation)
  if (output4.data.length > 0) {
    TestValidator.predicate(
      "value-filtered results match old_value criteria",
      output4.data.every((change) => change.old_value === null),
    );
    TestValidator.predicate(
      "value-filtered results match new_value criteria",
      output4.data.every(
        (change) =>
          change.new_value !== null && change.new_value.includes("active"),
      ),
    );
  }
  // 8. Test pagination boundary (page 2)
  const output5: IPageIHrmPlatformActivityLogChange.ISummary =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId,
        body: {
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(output5);
  TestValidator.equals(
    "page 2 parameter respected",
    output5.pagination.current,
    2,
  );
  // 9. Verify pagination consistency
  TestValidator.predicate(
    "pagination pages calculation is consistent",
    output1.pagination.pages ===
      Math.ceil(output1.pagination.records / output1.pagination.limit),
  );
}