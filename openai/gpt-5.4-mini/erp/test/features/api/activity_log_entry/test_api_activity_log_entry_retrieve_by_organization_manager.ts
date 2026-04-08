import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeActivityLogEntry";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_entry_retrieve_by_organization_manager(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234" as string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/erp-hrm-time/onboarding",
      referrer: "https://example.com/erp-hrm-time",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const activityLogEntryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const first = await api.functional.erpHrmTime.member.activity_log_entries.at(
    memberConnection,
    { activityLogEntryId },
  );
  typia.assert(first);
  const second = await api.functional.erpHrmTime.member.activity_log_entries.at(
    memberConnection,
    { activityLogEntryId },
  );
  typia.assert(second);
  TestValidator.equals(
    "activity log entry should be stable across repeated reads",
    first,
    second,
  );
  TestValidator.equals(
    "activity log entry id should match request",
    first.id,
    activityLogEntryId,
  );
  TestValidator.equals(
    "activity log entry should preserve action type",
    first.actionType,
    second.actionType,
  );
  TestValidator.equals(
    "activity log entry should preserve target entity type",
    first.targetEntityType,
    second.targetEntityType,
  );
  TestValidator.equals(
    "activity log entry should preserve target entity id",
    first.targetEntityId,
    second.targetEntityId,
  );
  TestValidator.equals(
    "activity log entry should preserve details",
    first.details,
    second.details,
  );
  TestValidator.equals(
    "activity log entry should preserve createdAt",
    first.createdAt,
    second.createdAt,
  );
  TestValidator.equals(
    "activity log entry should preserve updatedAt",
    first.updatedAt,
    second.updatedAt,
  );
  TestValidator.equals(
    "activity log entry should preserve deletedAt",
    first.deletedAt,
    second.deletedAt,
  );
}
