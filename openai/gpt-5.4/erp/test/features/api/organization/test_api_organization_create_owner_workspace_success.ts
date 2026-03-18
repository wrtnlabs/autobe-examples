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

export async function test_api_organization_create_owner_workspace_success(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: IHrmTimeTrackingOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/owner/join",
        referrer: "https://example.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(owner);
  const createBody = {
    name: `Workspace ${RandomGenerator.name(2)} ${RandomGenerator.alphabets(4)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: `https://example.com/assets/${RandomGenerator.alphabets(8)}.png`,
    currency_code: "USD",
    timezone: "Asia/Seoul",
    fiscal_start_month: 1,
  } satisfies IHrmTimeTrackingOrganization.ICreate;
  const organization: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: createBody,
      },
    );
  typia.assert(organization);
  TestValidator.notEquals(
    "organization id differs from owner id",
    organization.id,
    owner.id,
  );
  TestValidator.equals(
    "organization name preserved",
    organization.name,
    createBody.name,
  );
  TestValidator.equals(
    "organization description preserved",
    organization.description,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "organization logo uri preserved",
    organization.logo_uri,
    createBody.logo_uri ?? null,
  );
  TestValidator.equals(
    "organization currency code preserved",
    organization.currency_code,
    createBody.currency_code,
  );
  TestValidator.equals(
    "organization timezone preserved",
    organization.timezone,
    createBody.timezone,
  );
  TestValidator.equals(
    "organization fiscal start month preserved",
    organization.fiscal_start_month,
    createBody.fiscal_start_month,
  );
  TestValidator.equals("organization is active", organization.deleted_at, null);
  TestValidator.notEquals(
    "organization created_at is populated",
    organization.created_at,
    "",
  );
  TestValidator.notEquals(
    "organization updated_at is populated",
    organization.updated_at,
    "",
  );
}
