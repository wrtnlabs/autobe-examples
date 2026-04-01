import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const organizationMembershipId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    status: RandomGenerator.alphabets(8),
    isSelectedContext: true,
  } satisfies IErpHrmTimeOrganizationMembership.IUpdate;
  const updated =
    await api.functional.erpHrmTime.member.organizationMemberships.update(
      memberConnection,
      {
        organizationMembershipId,
        body,
      },
    );
  typia.assert(updated);
  TestValidator.equals("membership id preserved", updated.id, updated.id);
  TestValidator.predicate(
    "selected context requested",
    updated.isSelectedContext === true,
  );
  TestValidator.predicate(
    "active membership remains undeleted",
    updated.deletedAt === null,
  );
  TestValidator.predicate("updatedAt present", updated.updatedAt.length > 0);
  TestValidator.predicate(
    "member relation present",
    updated.member !== null && updated.member !== undefined,
  );
  TestValidator.predicate(
    "organization relation present",
    updated.organization !== null && updated.organization !== undefined,
  );
}
