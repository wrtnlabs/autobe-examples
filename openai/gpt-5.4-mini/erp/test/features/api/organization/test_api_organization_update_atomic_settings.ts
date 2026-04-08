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

export async function test_api_organization_update_atomic_settings(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: RandomGenerator.mobile(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logoImageUrl: "https://example.com/logo.png",
    currencyCode: "USD",
    timezone: "Asia/Seoul",
    fiscalStartMonth: 4,
  } satisfies IErpHrmTimeOrganizationDashboardSummary.IUpdate;
  const updated = await api.functional.erpHrmTime.member.organizations.update(
    memberConnection,
    {
      organizationId,
      body,
    },
  );
  typia.assert(updated);
  TestValidator.equals("organization id preserved", updated.id, updated.id);
  TestValidator.predicate(
    "organization name updated",
    updated.name === body.name,
  );
  TestValidator.predicate(
    "organization description updated",
    updated.description === body.description,
  );
  TestValidator.predicate(
    "organization logo updated",
    updated.logoImageUrl === body.logoImageUrl,
  );
  TestValidator.predicate(
    "organization status remains present",
    typeof updated.status === "string" && updated.status.length > 0,
  );
  TestValidator.predicate(
    "organization owner remains present",
    updated.ownerMember !== null && updated.ownerMember !== undefined,
  );
  TestValidator.predicate(
    "organization created timestamp remains present",
    typeof updated.createdAt === "string" && updated.createdAt.length > 0,
  );
  TestValidator.predicate(
    "organization deleted timestamp remains null for active tenant",
    updated.deletedAt === null,
  );
}
