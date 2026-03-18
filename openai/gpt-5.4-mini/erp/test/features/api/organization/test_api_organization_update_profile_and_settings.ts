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

export async function test_api_organization_update_profile_and_settings(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const organizationConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const logoImageUrl = `https://example.com/${RandomGenerator.alphaNumeric(10)}.png`;
  const updatedLogoImageUrl = `https://example.com/${RandomGenerator.alphaNumeric(12)}.png`;
  const body = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logoImageUrl: logoImageUrl satisfies string & tags.Format<"url">,
    currency: "KRW",
    timezone: "Asia/Seoul",
    fiscalStartMonth: 4,
  } satisfies IHrmTimeTrackingOrganization.IUpdate;
  const organization =
    await api.functional.hrmTimeTracking.member.organizations.update(
      organizationConnection,
      {
        organizationId,
        body,
      },
    );
  typia.assert(organization);
  TestValidator.equals(
    "organization id should be preserved",
    organization.id,
    organizationId,
  );
  TestValidator.equals(
    "organization name should update",
    organization.name,
    body.name,
  );
  TestValidator.equals(
    "organization description should update",
    organization.description,
    body.description,
  );
  TestValidator.equals(
    "organization logo image URL should update",
    organization.logoImageUrl,
    body.logoImageUrl,
  );
  TestValidator.equals(
    "organization currency should update",
    organization.currency,
    body.currency,
  );
  TestValidator.equals(
    "organization timezone should update",
    organization.timezone,
    body.timezone,
  );
  TestValidator.equals(
    "organization fiscal start month should update",
    organization.fiscalStartMonth,
    body.fiscalStartMonth,
  );
  TestValidator.equals(
    "organization deletedAt should stay null",
    organization.deletedAt,
    null,
  );
  const secondBody = {
    name: `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`,
    description: null,
    logoImageUrl: updatedLogoImageUrl satisfies string & tags.Format<"url">,
    currency: "USD",
    timezone: "UTC",
    fiscalStartMonth: 12,
  } satisfies IHrmTimeTrackingOrganization.IUpdate;
  const secondOrganizationId = typia.random<string & tags.Format<"uuid">>();
  const secondOrganization =
    await api.functional.hrmTimeTracking.member.organizations.update(
      organizationConnection,
      {
        organizationId: secondOrganizationId,
        body: secondBody,
      },
    );
  typia.assert(secondOrganization);
  TestValidator.equals(
    "second organization id should be preserved",
    secondOrganization.id,
    secondOrganizationId,
  );
  TestValidator.equals(
    "second organization name should update",
    secondOrganization.name,
    secondBody.name,
  );
  TestValidator.equals(
    "second organization description should update",
    secondOrganization.description,
    secondBody.description,
  );
  TestValidator.equals(
    "second organization logo image URL should update",
    secondOrganization.logoImageUrl,
    secondBody.logoImageUrl,
  );
  TestValidator.equals(
    "second organization currency should update",
    secondOrganization.currency,
    secondBody.currency,
  );
  TestValidator.equals(
    "second organization timezone should update",
    secondOrganization.timezone,
    secondBody.timezone,
  );
  TestValidator.equals(
    "second organization fiscal start month should update",
    secondOrganization.fiscalStartMonth,
    secondBody.fiscalStartMonth,
  );
  TestValidator.equals(
    "second organization deletedAt should stay null",
    secondOrganization.deletedAt,
    null,
  );
}
