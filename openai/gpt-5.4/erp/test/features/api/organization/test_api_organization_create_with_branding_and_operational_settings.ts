import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_organization_create_with_branding_and_operational_settings(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const body = {
    name: `Organization ${RandomGenerator.name(2)} ${RandomGenerator.alphabets(4)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
    currency_code: "USD",
    timezone: "Asia/Seoul",
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  } satisfies IHrmTimeTrackingOrganization.ICreate;
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body,
      },
    );
  typia.assert(organization);
  TestValidator.equals(
    "organization name is persisted",
    organization.name,
    body.name,
  );
  TestValidator.equals(
    "organization description is persisted",
    organization.description,
    body.description ?? null,
  );
  TestValidator.equals(
    "organization logo uri is persisted",
    organization.logo_uri,
    body.logo_uri ?? null,
  );
  TestValidator.equals(
    "organization currency code is persisted",
    organization.currency_code,
    body.currency_code,
  );
  TestValidator.equals(
    "organization timezone is persisted",
    organization.timezone,
    body.timezone,
  );
  TestValidator.equals(
    "organization fiscal start month is persisted",
    organization.fiscal_start_month,
    body.fiscal_start_month,
  );
  TestValidator.equals(
    "newly created organization is active",
    organization.deleted_at,
    null,
  );
}
