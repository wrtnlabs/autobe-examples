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

export async function test_api_organization_membership_delete_in_active_context(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(12)}@example.com` satisfies string &
        tags.Format<"email">,
      password: "P@ssw0rd123!" satisfies string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/landing" satisfies string &
        tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const activeConnection: api.IConnection = { host: connection.host };
  activeConnection.headers = { Authorization: owner.token.access };
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_member_join(targetConnection, {
    body: {
      email:
        `${RandomGenerator.alphabets(12)}-target@example.com` satisfies string &
          tags.Format<"email">,
      password: "P@ssw0rd123!" satisfies string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding-target" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/landing-target" satisfies string &
        tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(target);
  const membership =
    await generate_random_erp_hrm_time_member_organization_memberships_create(
      activeConnection,
      {
        body: {
          employeeId: typia.random<string & tags.Format<"uuid">>(),
          roleId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IErpHrmTimeOrganizationMembership.ICreate,
      },
    );
  typia.assert(membership);
  await api.functional.erpHrmTime.member.organizationMemberships.erase(
    activeConnection,
    {
      organizationMembershipId: membership.id,
    },
  );
}
