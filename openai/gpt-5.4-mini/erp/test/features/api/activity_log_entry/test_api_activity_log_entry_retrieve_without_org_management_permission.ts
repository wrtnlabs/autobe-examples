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

export async function test_api_activity_log_entry_retrieve_without_org_management_permission(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/erp-hrm-time/join",
      referrer: "https://example.com/erp-hrm-time",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  memberConnection.headers = {
    ...(memberConnection.headers ?? {}),
    Authorization: authorized.token.access,
  };
  await TestValidator.httpError(
    "member without org management permission cannot retrieve activity log entry",
    [403, 404],
    async () => {
      await api.functional.erpHrmTime.member.activity_log_entries.at(
        memberConnection,
        {
          activityLogEntryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
