import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_organization_dashboard_summary_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  const joined = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        displayName: RandomGenerator.name(),
        href: `https://example.com/${RandomGenerator.alphabets(8)}`,
        referrer: `https://example.com/${RandomGenerator.alphabets(8)}`,
        avatarImageUrl: null,
        phoneNumber: null,
        ip: null,
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(joined);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${joined.token.access}`,
    },
  };
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const dashboardSummaryId = typia.random<string & tags.Format<"uuid">>();
  const first =
    await api.functional.erpHrmTime.member.organizations.dashboardSummaries.at(
      memberConnection,
      {
        organizationId,
        dashboardSummaryId,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.erpHrmTime.member.organizations.dashboardSummaries.at(
      memberConnection,
      {
        organizationId,
        dashboardSummaryId,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "dashboard summary should be stable across repeated reads",
    first,
    second,
  );
  TestValidator.equals(
    "dashboard summary id should remain stable",
    first.id,
    second.id,
  );
  TestValidator.equals(
    "dashboard summary name should remain stable",
    first.name,
    second.name,
  );
  TestValidator.equals(
    "dashboard summary status should remain stable",
    first.status,
    second.status,
  );
}
