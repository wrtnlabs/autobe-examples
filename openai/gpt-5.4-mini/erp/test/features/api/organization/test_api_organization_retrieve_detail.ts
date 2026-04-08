import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_retrieve_detail(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/${RandomGenerator.alphabets(8)}`,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const organization = await api.functional.erpHrmTime.member.organizations.at(
    memberConnection,
    {
      organizationId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(organization);
  TestValidator.predicate(
    "organization owner summary should exist",
    organization.ownerMember !== null && organization.ownerMember !== undefined,
  );
  TestValidator.predicate(
    "organization id should be a uuid",
    organization.id.length > 0,
  );
  TestValidator.predicate(
    "organization name should be a non-empty string",
    organization.name.length > 0,
  );
  TestValidator.predicate(
    "organization status should be a non-empty string",
    organization.status.length > 0,
  );
}
