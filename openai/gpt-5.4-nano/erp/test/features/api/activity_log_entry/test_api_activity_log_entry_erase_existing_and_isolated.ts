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

export async function test_api_activity_log_entry_erase_existing_and_isolated(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join (establish auth + organization context)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  // 2) Create activity log entry
  const created =
    await generate_random_erp_hrm_time_tracking_member_activity_log_entries_create(
      memberConnection,
      {},
    );
  typia.assert(created);
  const activityLogEntryId = created.id;
  // 3) Delete activity log entry
  await api.functional.erpHrmTimeTracking.member.activityLogEntries.erase(
    memberConnection,
    { activityLogEntryId },
  );
  // 5) Validate deletion integrity
  await TestValidator.error(
    "activity log entry should not be accessible after erase",
    async () => {
      await api.functional.erpHrmTimeTracking.member.activityLogEntries.at(
        memberConnection,
        { activityLogEntryId },
      );
    },
  );
  // 6) Idempotency: delete again
  await TestValidator.error(
    "activity log entry erase should be idempotent and fail after first erase",
    async () => {
      await api.functional.erpHrmTimeTracking.member.activityLogEntries.erase(
        memberConnection,
        { activityLogEntryId },
      );
    },
  );
}
