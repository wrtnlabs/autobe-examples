import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_activity_log_entries_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_activity_log_entries_create";
import { prepare_random_erp_hrm_time_tracking_activity_log_entry } from "../../../prepare/prepare_random_erp_hrm_time_tracking_activity_log_entry";

export async function test_api_activity_log_entry_create_occurred_at_and_details_propagation(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member registration (actor-specific connection)
  const memberConnection: api.IConnection = { host: connection.host };
  const now = new Date();
  const email = `${RandomGenerator.alphabets(10)}.${RandomGenerator.alphabets(5)}@example.com`;
  const password = RandomGenerator.alphabets(12);
  const joined: IErpHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: email satisfies IErpHrmTimeTrackingMember.IJoin["email"],
        password,
        organizationName: RandomGenerator.name(),
        organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
        organizationLogoUrl: null,
        organizationCurrencyCode: "USD",
        organizationTimezone: "Asia/Seoul",
        organizationFiscalStartMonth: 1,
        href: "https://example.com/join",
        referrer: "https://example.com/ref",
        ip: "127.0.0.1",
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    });
  typia.assert(joined);
  // 2) Create two activity log entries for the same target with different occurred_at and details
  const target_entity_type = RandomGenerator.pick([
    "member",
    "timesheet",
    "project",
    "task",
  ]);
  const target_entity_id = typia.random<string & tags.Format<"uuid">>();
  const earlierOccuredAt = new Date(now.getTime() - 60000).toISOString();
  const laterOccuredAt = new Date(now.getTime() + 60000).toISOString();
  const summaryBase = RandomGenerator.paragraph({ sentences: 2 });
  const first: IErpHrmTimeTrackingActivityLogEntry =
    await generate_random_erp_hrm_time_tracking_member_activity_log_entries_create(
      memberConnection,
      {
        body: {
          action_type: "activity.test",
          target_entity_type,
          target_entity_id,
          summary: `${summaryBase} - earlier`,
          details: null,
          occurred_at: earlierOccuredAt,
        } satisfies IErpHrmTimeTrackingActivityLogEntry.ICreate,
      },
    );
  typia.assert(first);
  const secondDetails = "some context";
  const second: IErpHrmTimeTrackingActivityLogEntry =
    await generate_random_erp_hrm_time_tracking_member_activity_log_entries_create(
      memberConnection,
      {
        body: {
          action_type: "activity.test",
          target_entity_type,
          target_entity_id,
          summary: `${summaryBase} - later`,
          details: secondDetails,
          occurred_at: laterOccuredAt,
        } satisfies IErpHrmTimeTrackingActivityLogEntry.ICreate,
      },
    );
  typia.assert(second);
  // 3) Validate response fields
  TestValidator.equals("first.details is null", first.details, null);
  TestValidator.equals("second.details matches", second.details, secondDetails);
  TestValidator.equals(
    "first.occurred_at echoes",
    first.occurred_at,
    earlierOccuredAt,
  );
  TestValidator.equals(
    "second.occurred_at echoes",
    second.occurred_at,
    laterOccuredAt,
  );
  // 4) Ordering readiness
  TestValidator.notEquals("IDs differ", first.id, second.id);
  TestValidator.predicate(
    "later.occurred_at is after earlier",
    new Date(second.occurred_at).getTime() >
      new Date(first.occurred_at).getTime(),
  );
}
