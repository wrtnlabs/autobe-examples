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

export async function test_api_organization_update_settings(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: RandomGenerator.mobile(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logoImageUrl: "https://example.com/logo.png",
    currencyCode: "USD",
    timezone: "Asia/Seoul",
    fiscalStartMonth: 4,
  } satisfies IErpHrmTimeOrganizationDashboardSummary.IUpdate;
  const output = await api.functional.erpHrmTime.member.organizations.update(
    memberConnection,
    {
      organizationId,
      body,
    },
  );
  typia.assert(output);
  TestValidator.equals("organization id", output.id, output.id);
  TestValidator.equals("organization name", output.name, output.name);
  TestValidator.equals(
    "organization description",
    output.description,
    output.description,
  );
  TestValidator.equals(
    "organization logo",
    output.logoImageUrl,
    output.logoImageUrl,
  );
  TestValidator.predicate(
    "organization owner exists",
    output.ownerMember !== null && output.ownerMember !== undefined,
  );
  TestValidator.predicate(
    "organization status exists",
    output.status.length > 0,
  );
  TestValidator.predicate(
    "created timestamp exists",
    output.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp exists",
    output.updatedAt.length > 0,
  );
  TestValidator.equals("organization not deleted", output.deletedAt, null);
}
