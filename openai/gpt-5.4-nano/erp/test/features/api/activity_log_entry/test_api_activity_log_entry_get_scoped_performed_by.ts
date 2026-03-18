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

export async function test_api_activity_log_entry_get_scoped_performed_by(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  // 1) Join as member (creates member + initial organization context)
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd_" + RandomGenerator.alphabets(8);
  const organizationName = "org_" + RandomGenerator.alphabets(10);
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/" + RandomGenerator.alphabets(6),
      referrer: "https://ref.example.com/" + RandomGenerator.alphabets(6),
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  // Create actor-specific authenticated connection
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers ??= {};
  authorizedConnection.headers.Authorization = joined.token.access;
  // 3) Call GET with a random UUID (cannot deterministically create/list activity logs with given API surface)
  const activityLogEntryId = typia.random<string & tags.Format<"uuid">>();
  // 4) Tenant scoping: random IDs should not be accessible; expect rejection.
  await TestValidator.error(
    "should not expose activity log entry for random id within member organization scope",
    async () => {
      await api.functional.erpHrmTimeTracking.member.activityLogEntries.at(
        authorizedConnection,
        {
          activityLogEntryId,
        },
      );
    },
  );
}
