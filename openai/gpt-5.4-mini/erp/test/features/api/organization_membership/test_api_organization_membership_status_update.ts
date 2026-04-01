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

export async function test_api_organization_membership_status_update(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const updated =
    await api.functional.erpHrmTime.member.organizationMemberships.update(
      memberConnection,
      {
        organizationMembershipId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: "active",
        } satisfies IErpHrmTimeOrganizationMembership.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.predicate("membership id exists", updated.id.length > 0);
  TestValidator.predicate(
    "membership status exists",
    updated.status.length > 0,
  );
  TestValidator.predicate(
    "member association is preserved",
    updated.member !== null && updated.member !== undefined,
  );
  TestValidator.predicate(
    "organization association is preserved",
    updated.organization !== null && updated.organization !== undefined,
  );
  TestValidator.predicate(
    "membership timestamps are ordered",
    new Date(updated.createdAt).getTime() <=
      new Date(updated.updatedAt).getTime(),
  );
  TestValidator.predicate(
    "membership deletion timestamp is nullable",
    updated.deletedAt === null || typeof updated.deletedAt === "string",
  );
}
