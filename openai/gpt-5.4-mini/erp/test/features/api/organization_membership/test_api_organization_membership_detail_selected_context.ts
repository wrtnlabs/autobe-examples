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

export async function test_api_organization_membership_detail_selected_context(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const membershipId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "membership detail should reject unknown membership ids or otherwise return a valid detail payload",
    async () => {
      const output =
        await api.functional.erpHrmTime.member.organizationMemberships.at(
          memberConnection,
          {
            organizationMembershipId: membershipId,
          },
        );
      typia.assert(output);
      TestValidator.equals(
        "membership id matches request",
        output.id,
        membershipId,
      );
      TestValidator.predicate(
        "membership is selected context flag present",
        typeof output.isSelectedContext === "boolean",
      );
      TestValidator.predicate(
        "membership status is present",
        output.status.length > 0,
      );
      TestValidator.predicate(
        "createdAt is present",
        output.createdAt.length > 0,
      );
      TestValidator.predicate(
        "updatedAt is present",
        output.updatedAt.length > 0,
      );
      TestValidator.equals(
        "deletedAt is null or timestamp",
        output.deletedAt,
        output.deletedAt,
      );
    },
  );
}
