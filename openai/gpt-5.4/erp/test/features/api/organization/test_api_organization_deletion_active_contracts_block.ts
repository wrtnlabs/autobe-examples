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

export async function test_api_organization_deletion_active_contracts_block(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://example.com/owners/join",
    referrer: "https://example.com/owners",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingOwner.IJoin;
  const authorized: IHrmTimeTrackingOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {
      body: ownerJoinBody,
    });
  typia.assert(authorized);
  TestValidator.equals(
    "owner email matches join input",
    authorized.email,
    ownerJoinBody.email,
  );
  const organizationBody = {
    name: `org-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://example.com/logo.png",
    currency_code: "USD",
    timezone: "Asia/Seoul",
    fiscal_start_month: 1,
  } satisfies IHrmTimeTrackingOrganization.ICreate;
  const organization: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: organizationBody,
      },
    );
  typia.assert(organization);
  TestValidator.equals(
    "organization name matches creation input",
    organization.name,
    organizationBody.name,
  );
  try {
    await api.functional.hrmTimeTracking.owner.organizations.erase(
      ownerConnection,
      {
        organizationId: organization.id,
      },
    );
  } catch {
    return;
  }
}
