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

export async function test_api_organization_settings_update_cross_context_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(authorized);
  const firstOrganization: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}-a`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 3,
        },
      },
    );
  typia.assert(firstOrganization);
  const secondOrganization: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}-b`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Tokyo",
          fiscal_start_month: 9,
        },
      },
    );
  typia.assert(secondOrganization);
  const crossContextUpdate = {
    name: `updated-${RandomGenerator.alphabets(10)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
    currency_code: "EUR",
    timezone: "Europe/London",
    fiscal_start_month: 12,
  } satisfies IHrmTimeTrackingOrganization.IUpdate;
  TestValidator.notEquals(
    "update payload name differs from first organization",
    firstOrganization.name,
    crossContextUpdate.name,
  );
  TestValidator.notEquals(
    "update payload description differs from first organization",
    firstOrganization.description,
    crossContextUpdate.description,
  );
  TestValidator.notEquals(
    "update payload logo differs from first organization",
    firstOrganization.logo_uri,
    crossContextUpdate.logo_uri,
  );
  TestValidator.notEquals(
    "update payload currency differs from first organization",
    firstOrganization.currency_code,
    crossContextUpdate.currency_code,
  );
  TestValidator.notEquals(
    "update payload timezone differs from first organization",
    firstOrganization.timezone,
    crossContextUpdate.timezone,
  );
  TestValidator.notEquals(
    "update payload fiscal month differs from first organization",
    firstOrganization.fiscal_start_month,
    crossContextUpdate.fiscal_start_month,
  );
  TestValidator.notEquals(
    "second organization is different from the first organization",
    firstOrganization.id,
    secondOrganization.id,
  );
  await TestValidator.httpError(
    "cross-context organization settings update is rejected",
    [400, 403, 404, 409],
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.update(
        ownerConnection,
        {
          organizationId: firstOrganization.id,
          body: crossContextUpdate,
        },
      );
    },
  );
}
