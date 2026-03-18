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

export async function test_api_organization_create_tenant_profile_only(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: `tenant-${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const expected = {
    name: `Tenant ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logoImageUrl: null,
    currency: "USD",
    timezone: "Asia/Seoul",
    fiscalStartMonth: 1,
  } satisfies IHrmTimeTrackingOrganization.ICreate;
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: expected,
      },
    );
  typia.assert(organization);
  TestValidator.equals("organization name", organization.name, expected.name);
  TestValidator.equals(
    "organization description",
    organization.description,
    expected.description,
  );
  TestValidator.equals(
    "organization logo image url",
    organization.logoImageUrl,
    expected.logoImageUrl,
  );
  TestValidator.equals(
    "organization currency",
    organization.currency,
    expected.currency,
  );
  TestValidator.equals(
    "organization timezone",
    organization.timezone,
    expected.timezone,
  );
  TestValidator.equals(
    "organization fiscal start month",
    organization.fiscalStartMonth,
    expected.fiscalStartMonth,
  );
  TestValidator.predicate("organization has id", organization.id.length > 0);
  TestValidator.predicate(
    "organization has timestamps",
    organization.createdAt.length > 0 && organization.updatedAt.length > 0,
  );
  TestValidator.equals("organization deleted at", organization.deletedAt, null);
}
