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

export async function test_api_organization_create_multi_workspace_isolation(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = {
    host: connection.host,
  };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const firstBody = {
    name: `workspace-${RandomGenerator.alphabets(6)}-one`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
    currency_code: "USD",
    timezone: "Asia/Seoul",
    fiscal_start_month: 1 satisfies number as number & tags.Type<"int32">,
  } satisfies IHrmTimeTrackingOrganization.ICreate;
  const secondBody = {
    name: `workspace-${RandomGenerator.alphabets(6)}-two`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
    currency_code: "JPY",
    timezone: "America/New_York",
    fiscal_start_month: 7 satisfies number as number & tags.Type<"int32">,
  } satisfies IHrmTimeTrackingOrganization.ICreate;
  const firstOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: firstBody,
      },
    );
  typia.assert(firstOrganization);
  const secondOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: secondBody,
      },
    );
  typia.assert(secondOrganization);
  const firstFiscalStartMonth =
    firstBody.fiscal_start_month satisfies number as number;
  const secondFiscalStartMonth =
    secondBody.fiscal_start_month satisfies number as number;
  TestValidator.notEquals(
    "organizations created in separate calls must have different ids",
    firstOrganization.id,
    secondOrganization.id,
  );
  TestValidator.equals(
    "first organization name matches first request",
    firstOrganization.name,
    firstBody.name,
  );
  TestValidator.equals(
    "first organization description matches first request",
    firstOrganization.description,
    firstBody.description ?? null,
  );
  TestValidator.equals(
    "first organization logo matches first request",
    firstOrganization.logo_uri,
    firstBody.logo_uri ?? null,
  );
  TestValidator.equals(
    "first organization currency matches first request",
    firstOrganization.currency_code,
    firstBody.currency_code,
  );
  TestValidator.equals(
    "first organization timezone matches first request",
    firstOrganization.timezone,
    firstBody.timezone,
  );
  TestValidator.equals(
    "first organization fiscal start month matches first request",
    firstOrganization.fiscal_start_month,
    firstFiscalStartMonth,
  );
  TestValidator.equals(
    "second organization name matches second request",
    secondOrganization.name,
    secondBody.name,
  );
  TestValidator.equals(
    "second organization description matches second request",
    secondOrganization.description,
    secondBody.description ?? null,
  );
  TestValidator.equals(
    "second organization logo matches second request",
    secondOrganization.logo_uri,
    secondBody.logo_uri ?? null,
  );
  TestValidator.equals(
    "second organization currency matches second request",
    secondOrganization.currency_code,
    secondBody.currency_code,
  );
  TestValidator.equals(
    "second organization timezone matches second request",
    secondOrganization.timezone,
    secondBody.timezone,
  );
  TestValidator.equals(
    "second organization fiscal start month matches second request",
    secondOrganization.fiscal_start_month,
    secondFiscalStartMonth,
  );
  TestValidator.notEquals(
    "workspace names remain isolated between creations",
    firstOrganization.name,
    secondOrganization.name,
  );
  TestValidator.notEquals(
    "workspace descriptions remain isolated between creations",
    firstOrganization.description,
    secondOrganization.description,
  );
  TestValidator.notEquals(
    "workspace logos remain isolated between creations",
    firstOrganization.logo_uri,
    secondOrganization.logo_uri,
  );
  TestValidator.notEquals(
    "workspace currencies remain isolated between creations",
    firstOrganization.currency_code,
    secondOrganization.currency_code,
  );
  TestValidator.notEquals(
    "workspace timezones remain isolated between creations",
    firstOrganization.timezone,
    secondOrganization.timezone,
  );
  TestValidator.notEquals(
    "workspace fiscal start months remain isolated between creations",
    firstOrganization.fiscal_start_month,
    secondOrganization.fiscal_start_month,
  );
}
