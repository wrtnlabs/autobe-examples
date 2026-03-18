import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_organization_settings_update_non_owner_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerPassword = "OwnerPass1234!";
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerJoin = await authorize_owner_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(ownerJoin);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 3,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const updateBody = {
    name: `updated-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
    currency_code: "KRW",
    timezone: "Asia/Tokyo",
    fiscal_start_month: 11,
  } satisfies IHrmTimeTrackingOrganization.IUpdate;
  const managerConnection: api.IConnection = { host: connection.host };
  const managerJoin = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ManagerPass1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingManager.IJoin,
  });
  typia.assert(managerJoin);
  await TestValidator.error(
    "manager cannot update organization through owner endpoint",
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.update(
        managerConnection,
        {
          organizationId: organization.id,
          body: updateBody,
        },
      );
    },
  );
  const ownerLoginConnection: api.IConnection = { host: connection.host };
  const ownerLogin = await authorize_owner_login(ownerLoginConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    } satisfies IHrmTimeTrackingOwner.ILogin,
  });
  typia.assert(ownerLogin);
  const updated =
    await api.functional.hrmTimeTracking.owner.organizations.update(
      ownerLoginConnection,
      {
        organizationId: organization.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "organization id unchanged",
    updated.id,
    organization.id,
  );
  TestValidator.equals("name updated by owner", updated.name, updateBody.name);
  TestValidator.equals(
    "description updated by owner",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "logo updated by owner",
    updated.logo_uri,
    updateBody.logo_uri,
  );
  TestValidator.equals(
    "currency updated by owner",
    updated.currency_code,
    updateBody.currency_code,
  );
  TestValidator.equals(
    "timezone updated by owner",
    updated.timezone,
    updateBody.timezone,
  );
  TestValidator.equals(
    "fiscal month updated by owner",
    updated.fiscal_start_month,
    updateBody.fiscal_start_month,
  );
}
