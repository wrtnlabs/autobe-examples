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

export async function test_api_activity_log_changes_filter_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test filtering activity log changes by field_name, field_type, old_value, and new_value parameters.
   *
   * This test validates the activity log changes filtering functionality by:
   * 1. Authenticating as a member
   * 2. Testing various filter combinations
   * 3. Verifying pagination with filters
   * 4. Testing pattern matching in old_value and new_value
   */
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Generate a valid activity log ID for testing
  const activityLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Test field_name filter - exact match
  const fieldNameFilterResult =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId,
        body: {
          field_name: "status",
        },
      },
    );
  typia.assert(fieldNameFilterResult);
  TestValidator.predicate(
    "field_name filter returns paginated result",
    fieldNameFilterResult.pagination.current >= 1,
  );
  // 3. Test field_type filter - exact match on data types
  const fieldTypes = ["string", "int", "datetime", "boolean", "uuid"] as const;
  for (const fieldType of fieldTypes) {
    const fieldTypeResult =
      await api.functional.hrmPlatform.member.activity_logs.changes.index(
        memberConnection,
        {
          activityLogId,
          body: {
            field_type: fieldType,
          },
        },
      );
    typia.assert(fieldTypeResult);
    TestValidator.predicate(
      `field_type filter for ${fieldType} works`,
      fieldTypeResult.pagination.current >= 1,
    );
    // Verify all returned changes have the correct field_type
    for (const change of fieldTypeResult.data) {
      TestValidator.equals(
        `change has correct field_type ${fieldType}`,
        change.field_type,
        fieldType,
      );
    }
  }
  // 4. Test old_value pattern matching
  const oldValueFilterResult =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId,
        body: {
          old_value: "draft",
        },
      },
    );
  typia.assert(oldValueFilterResult);
  TestValidator.predicate(
    "old_value filter returns paginated result",
    oldValueFilterResult.pagination.current >= 1,
  );
  // 5. Test new_value pattern matching
  const newValueFilterResult =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId,
        body: {
          new_value: "published",
        },
      },
    );
  typia.assert(newValueFilterResult);
  TestValidator.predicate(
    "new_value filter returns paginated result",
    newValueFilterResult.pagination.current >= 1,
  );
  // 6. Test combined filters - field_name + field_type
  const combinedFilterResult =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId,
        body: {
          field_name: "title",
          field_type: "string",
        },
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined field_name and field_type filter works",
    combinedFilterResult.pagination.current >= 1,
  );
  // Verify all results match both filters
  for (const change of combinedFilterResult.data) {
    TestValidator.equals(
      "change matches field_name filter",
      change.field_name,
      "title",
    );
    TestValidator.equals(
      "change matches field_type filter",
      change.field_type,
      "string",
    );
  }
  // 7. Test pagination with filters
  const paginationResult =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId,
        body: {
          field_name: "assigned_to",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination data count matches or less than limit",
    paginationResult.data.length <= 10,
  );
  // Test page 2
  const page2Result =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId,
        body: {
          field_name: "assigned_to",
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  // 8. Test all filters combined
  const allFiltersResult =
    await api.functional.hrmPlatform.member.activity_logs.changes.index(
      memberConnection,
      {
        activityLogId,
        body: {
          field_name: "description",
          field_type: "string",
          old_value: "",
          new_value: "updated",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(allFiltersResult);
  TestValidator.predicate(
    "all filters combined returns valid result",
    allFiltersResult.pagination.current >= 1,
  );
  // Verify all results match all filter criteria
  for (const change of allFiltersResult.data) {
    TestValidator.equals(
      "change matches all filters - field_name",
      change.field_name,
      "description",
    );
    TestValidator.equals(
      "change matches all filters - field_type",
      change.field_type,
      "string",
    );
    TestValidator.predicate(
      "change has activity log reference",
      change.activityLog !== null,
    );
  }
  // 9. Verify pagination metadata consistency
  TestValidator.predicate(
    "pagination records count is non-negative",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    paginationResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculation is correct",
    paginationResult.pagination.pages ===
      Math.ceil(
        paginationResult.pagination.records / paginationResult.pagination.limit,
      ),
  );
}
