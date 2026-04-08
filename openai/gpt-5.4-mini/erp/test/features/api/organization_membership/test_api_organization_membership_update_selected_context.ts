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

export async function test_api_organization_membership_update_selected_context(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` as string &
        tags.Format<"email">,
      password: "P@ssw0rd123!" as string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  await TestValidator.httpError(
    "updateing a non-existent organization membership should fail",
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
            is_selected_context: true,
          } satisfies IErpHrmTimeOrganizationMembership.IUpdate,
        },
      );
    },
  );
}
