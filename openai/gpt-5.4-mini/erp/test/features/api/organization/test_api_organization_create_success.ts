import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_organization_create_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const body = {
    name: `org-${RandomGenerator.alphaNumeric(12)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logoImageUrl: `https://example.com/logo-${RandomGenerator.alphaNumeric(8)}.png`,
    currency: RandomGenerator.pick(["USD", "KRW", "EUR", "JPY"] as const),
    timezone: RandomGenerator.pick([
      "Asia/Seoul",
      "UTC",
      "America/New_York",
      "Europe/London",
    ] as const),
    fiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  } satisfies IHrmTimeTrackingOrganization.ICreate;
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body,
      },
    );
  typia.assert(organization);
  TestValidator.equals("organization name", organization.name, body.name);
  TestValidator.equals(
    "organization description",
    organization.description,
    body.description ?? null,
  );
  TestValidator.equals(
    "organization logo image url",
    organization.logoImageUrl,
    body.logoImageUrl ?? null,
  );
  TestValidator.equals(
    "organization currency",
    organization.currency,
    body.currency,
  );
  TestValidator.equals(
    "organization timezone",
    organization.timezone,
    body.timezone,
  );
  TestValidator.equals(
    "organization fiscal start month",
    organization.fiscalStartMonth,
    body.fiscalStartMonth,
  );
  TestValidator.predicate(
    "organization id should exist",
    organization.id.length > 0,
  );
  TestValidator.predicate(
    "organization createdAt should be present",
    organization.createdAt.length > 0,
  );
  TestValidator.predicate(
    "organization updatedAt should be present",
    organization.updatedAt.length > 0,
  );
  TestValidator.equals("organization deletedAt", organization.deletedAt, null);
}
