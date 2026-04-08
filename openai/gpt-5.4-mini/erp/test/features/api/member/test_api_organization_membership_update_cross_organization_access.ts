import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_membership_update_cross_organization_access(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const updateBody = {
    status: "active",
    is_selected_context: true,
  } satisfies IErpHrmTimeOrganizationMembership.IUpdate;
  await TestValidator.httpError(
    "membership update should be rejected for an inaccessible organization context",
    [403, 404],
    async () => {
      await api.functional.erpHrmTime.member.organizationMemberships.update(
        memberConnection,
        {
          organizationMembershipId: typia.random<
            string & tags.Format<"uuid">
          >(),
          body: updateBody,
        },
      );
    },
  );
  await TestValidator.httpError(
    "membership update should be rejected for a removed or missing membership",
    [403, 404],
    async () => {
      await api.functional.erpHrmTime.member.organizationMemberships.update(
        memberConnection,
        {
          organizationMembershipId: typia.random<
            string & tags.Format<"uuid">
          >(),
          body: {
            status: "active",
          } satisfies IErpHrmTimeOrganizationMembership.IUpdate,
        },
      );
    },
  );
}
