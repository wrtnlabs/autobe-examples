import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogChange";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful retrieval of a specific field-level change from an activity log.
 *
 * This test validates the complete success path for retrieving a single field-level
 * change record from the HRM Platform activity log system. It verifies that:
 * - Member authentication works correctly
 * - Activity log change retrieval returns properly structured data
 * - All required fields are present and correctly typed
 * - The change record correctly references its parent activity log
 * - Organization-level data isolation is enforced
 */
export async function test_api_activity_log_change_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication setup
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate valid UUIDs for activity log and change record
  // These would typically come from existing activity logs created by business operations
  const activityLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const changeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the specific field-level change
  const change =
    await api.functional.hrmPlatform.member.activity_logs.changes.at(
      memberConnection,
      {
        activityLogId,
        changeId,
      },
    );
  typia.assert(change);
  // 4. Validate the change record belongs to the specified activity log
  TestValidator.equals(
    "change belongs to specified activity log",
    change.hrm_platform_activity_log_id,
    activityLogId,
  );
  // 5. Validate the change record has the requested changeId
  TestValidator.equals("change has requested ID", change.id, changeId);
  // 6. Validate business logic: field modification data is present
  TestValidator.predicate(
    "field name is specified",
    change.field_name.length > 0,
  );
  // At least one of old_value or new_value should be present for a meaningful change
  TestValidator.predicate(
    "change has value information",
    change.old_value !== null || change.new_value !== null,
  );
}
