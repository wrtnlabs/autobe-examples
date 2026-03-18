import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingActivityLogEntry";
import type { IPageIErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_search_authorization_requires_org_manage(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member
  const memberJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    organizationName: `org-${RandomGenerator.alphaNumeric(8)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: `https://example.com/href/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://example.com/referrer/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  // authorize_member_join updates connection headers internally for subsequent calls
  await authorize_member_join(connection, {
    body: memberJoinInput,
  });
  // Create an actor-specific connection (base only). Do NOT set Authorization header manually.
  const memberConnection: api.IConnection = { host: connection.host };
  // Reuse the already-authorized connection by copying headers set by authorize_member_join
  if (connection.headers) memberConnection.headers = { ...connection.headers };
  // 2) Call activityLogs/search and expect authorization denial
  await TestValidator.httpError(
    "member without org:manage should be denied for activity log search",
    [401, 403],
    async () => {
      const output =
        await api.functional.erpHrmTimeTracking.member.activityLogs.search(
          memberConnection,
          {
            body: {
              page: 1,
              limit: 5,
            } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest,
          },
        );
      typia.assert(output);
    },
  );
}
