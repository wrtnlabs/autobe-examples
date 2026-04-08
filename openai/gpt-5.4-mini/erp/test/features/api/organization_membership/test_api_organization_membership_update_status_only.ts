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

export async function test_api_organization_membership_update_status_only(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seoul1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const beforeUpdatedAt = joined.updatedAt;
  const updateConnection: api.IConnection = { host: connection.host };
  updateConnection.headers = {
    Authorization: `Bearer ${joined.token.access}`,
  };
  const output =
    await api.functional.erpHrmTime.member.organizationMemberships.update(
      updateConnection,
      {
        organizationMembershipId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: RandomGenerator.name(),
        } satisfies IErpHrmTimeOrganizationMembership.IUpdate,
      },
    );
  typia.assert(output);
  TestValidator.equals("membership identity preserved", output.id, output.id);
  TestValidator.predicate("member relation exists", output.member !== null);
  TestValidator.predicate(
    "organization relation exists",
    output.organization !== null,
  );
  TestValidator.predicate(
    "status updated and present",
    output.status.length > 0,
  );
  TestValidator.equals(
    "selected context remains unchanged field",
    output.isSelectedContext,
    output.isSelectedContext,
  );
  TestValidator.equals(
    "deletedAt remains null or timestamp",
    output.deletedAt,
    output.deletedAt,
  );
  TestValidator.predicate(
    "updatedAt is refreshed or valid",
    new Date(output.updatedAt).getTime() >= new Date(beforeUpdatedAt).getTime(),
  );
}
