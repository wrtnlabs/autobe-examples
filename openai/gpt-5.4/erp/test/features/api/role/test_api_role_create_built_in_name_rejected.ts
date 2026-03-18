import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { generate_random_hrm_time_tracking_owner_organizations_roles_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_roles_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";
import { prepare_random_hrm_time_tracking_role_permission } from "../../../prepare/prepare_random_hrm_time_tracking_role_permission";

export async function test_api_role_create_built_in_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssword1234!Ab",
      href: "https://example.com/owners/join",
      referrer: "https://example.com/owners",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(authorized);
  const fiscalStartMonth = (typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
  >() ?? 1) satisfies number as number;
  const organizationBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://example.com/logo.png",
    currency_code: "USD",
    timezone: "Asia/Seoul",
    fiscal_start_month: fiscalStartMonth,
  } satisfies IHrmTimeTrackingOrganization.ICreate;
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: organizationBody,
      },
    );
  typia.assert(organization);
  const organizationId = organization.id;
  const organizationName = organization.name;
  const organizationCurrencyCode = organization.currency_code;
  const organizationTimezone = organization.timezone;
  const builtInNames = ["Owner", "Manager", "Employee"] as const;
  await ArrayUtil.asyncForEach(builtInNames, async (name) => {
    const body = {
      name,
      permissions: [
        {
          permissions: ["employee:view", "project:view"],
        },
      ],
    } satisfies IHrmTimeTrackingRole.ICreate;
    await TestValidator.error(
      `built-in role name ${name} must be rejected`,
      async () => {
        await generate_random_hrm_time_tracking_owner_organizations_roles_create(
          ownerConnection,
          {
            params: {
              organizationId: organization.id,
            },
            body,
          },
        );
      },
    );
  });
  TestValidator.equals(
    "organization id snapshot preserved after rejected role creations",
    organizationId,
    organization.id,
  );
  TestValidator.equals(
    "organization name snapshot preserved after rejected role creations",
    organizationName,
    organization.name,
  );
  TestValidator.equals(
    "organization currency snapshot preserved after rejected role creations",
    organizationCurrencyCode,
    organization.currency_code,
  );
  TestValidator.equals(
    "organization timezone snapshot preserved after rejected role creations",
    organizationTimezone,
    organization.timezone,
  );
}
