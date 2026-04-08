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
import { generate_random_erp_hrm_time_member_organization_memberships_create } from "../../../generate/generate_random_erp_hrm_time_member_organization_memberships_create";
import { prepare_random_erp_hrm_time_organization_membership } from "../../../prepare/prepare_random_erp_hrm_time_organization_membership";

export async function test_api_organization_membership_delete_sole_owner_blocked(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const membership =
    await generate_random_erp_hrm_time_member_organization_memberships_create(
      memberConnection,
      {
        body: {
          employeeId: joined.id,
          roleId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IErpHrmTimeOrganizationMembership.ICreate,
      },
    );
  typia.assert(membership);
  const beforeDelete: IErpHrmTimeOrganizationMembership = membership;
  await TestValidator.httpError(
    "deleting the sole owner membership is blocked",
    [409],
    async () => {
      await api.functional.erpHrmTime.member.organizationMemberships.erase(
        memberConnection,
        {
          organizationMembershipId: membership.id,
        },
      );
    },
  );
  TestValidator.equals(
    "organization membership remains unchanged after blocked delete",
    membership,
    beforeDelete,
  );
}
