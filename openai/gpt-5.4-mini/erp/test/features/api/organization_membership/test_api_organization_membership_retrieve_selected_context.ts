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

export async function test_api_organization_membership_retrieve_selected_context(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` satisfies string,
      password: "P@ssw0rd123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const membership =
    await api.functional.erpHrmTime.member.organizationMemberships.at(
      memberConnection,
      {
        organizationMembershipId: authorized.id,
      },
    );
  typia.assert(membership);
  TestValidator.predicate(
    "membership id should be present",
    membership.id.length > 0,
  );
  TestValidator.predicate(
    "membership should include member summary",
    membership.member !== null && membership.member !== undefined,
  );
  TestValidator.predicate(
    "membership should include organization summary",
    membership.organization !== null && membership.organization !== undefined,
  );
  TestValidator.predicate(
    "membership should mark selected context",
    membership.isSelectedContext === true ||
      membership.isSelectedContext === false,
  );
  TestValidator.predicate(
    "membership should expose created timestamp",
    membership.createdAt.length > 0,
  );
  TestValidator.predicate(
    "membership should expose updated timestamp",
    membership.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "membership should not expose role assignment fields",
    !("role" in membership) &&
      !("roleId" in membership) &&
      !("roleAssignment" in membership),
  );
}
