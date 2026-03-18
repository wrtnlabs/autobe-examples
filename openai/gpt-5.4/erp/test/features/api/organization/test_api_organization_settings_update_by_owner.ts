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

export async function test_api_organization_settings_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
      },
    });
  typia.assert(authorized);
  const createBody = {
    name: `Org ${RandomGenerator.name()}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
    currency_code: "USD",
    timezone: "Asia/Seoul",
    fiscal_start_month: 1,
  } satisfies IHrmTimeTrackingOrganization.ICreate;
  const created: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: createBody,
      },
    );
  typia.assert(created);
  const updateBody = {
    name: `Updated ${RandomGenerator.name()}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
    currency_code: "KRW",
    timezone: "America/New_York",
    fiscal_start_month: 12,
  } satisfies IHrmTimeTrackingOrganization.IUpdate;
  const updated: IHrmTimeTrackingOrganization =
    await api.functional.hrmTimeTracking.owner.organizations.update(
      ownerConnection,
      {
        organizationId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "organization id remains the same",
    updated.id,
    created.id,
  );
  TestValidator.notEquals(
    "name changed from original",
    updated.name,
    created.name,
  );
  TestValidator.notEquals(
    "description changed from original",
    updated.description,
    created.description,
  );
  TestValidator.notEquals(
    "logo uri changed from original",
    updated.logo_uri,
    created.logo_uri,
  );
  TestValidator.notEquals(
    "currency code changed from original",
    updated.currency_code,
    created.currency_code,
  );
  TestValidator.notEquals(
    "timezone changed from original",
    updated.timezone,
    created.timezone,
  );
  TestValidator.notEquals(
    "fiscal start month changed from original",
    updated.fiscal_start_month,
    created.fiscal_start_month,
  );
  TestValidator.equals("name updated", updated.name, updateBody.name);
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "logo uri updated",
    updated.logo_uri,
    updateBody.logo_uri,
  );
  TestValidator.equals(
    "currency code updated",
    updated.currency_code,
    updateBody.currency_code,
  );
  TestValidator.equals(
    "timezone updated",
    updated.timezone,
    updateBody.timezone,
  );
  TestValidator.equals(
    "fiscal start month updated",
    updated.fiscal_start_month,
    updateBody.fiscal_start_month,
  );
  TestValidator.equals(
    "created_at remains system managed",
    updated.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "deleted_at remains unchanged",
    updated.deleted_at,
    created.deleted_at,
  );
  TestValidator.notEquals(
    "updated_at refreshed after settings update",
    updated.updated_at,
    created.updated_at,
  );
}
