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

export async function test_api_organization_membership_create(
  connection: api.IConnection,
): Promise<void> {
  const authConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(authConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
      password: "Password123!" satisfies string,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const body = {
    employeeId: authorized.id,
    roleId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IErpHrmTimeOrganizationMembership.ICreate;
  const created =
    await api.functional.erpHrmTime.member.organizationMemberships.create(
      memberConnection,
      {
        body,
      },
    );
  typia.assert(created);
  TestValidator.predicate("membership id exists", created.id.length > 0);
  TestValidator.predicate(
    "membership has member summary",
    created.member !== null && created.member !== undefined,
  );
  TestValidator.predicate(
    "membership has organization summary",
    created.organization !== null && created.organization !== undefined,
  );
  TestValidator.predicate(
    "membership status is provided",
    created.status.length > 0,
  );
  TestValidator.predicate(
    "membership selected context flag is boolean",
    created.isSelectedContext === true || created.isSelectedContext === false,
  );
  TestValidator.equals(
    "membership is not soft deleted",
    created.deletedAt,
    null,
  );
}
