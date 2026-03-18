import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
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
import { generate_random_hrm_time_tracking_owner_departments_create } from "../../../generate/generate_random_hrm_time_tracking_owner_departments_create";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_department_delete_cross_organization_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1234!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingOwner.IJoin;
  const authorized = await authorize_owner_join(ownerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const sourceOrganizationBody = {
    name: `source-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    fiscal_start_month: 1,
  } satisfies IHrmTimeTrackingOrganization.ICreate;
  const sourceOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: sourceOrganizationBody,
      },
    );
  typia.assert(sourceOrganization);
  const sourceContextBody = {
    name: `${sourceOrganization.name} source`,
  } satisfies IHrmTimeTrackingOrganization.IUpdate;
  const sourceContext =
    await api.functional.hrmTimeTracking.owner.organizations.update(
      ownerConnection,
      {
        organizationId: sourceOrganization.id,
        body: sourceContextBody,
      },
    );
  typia.assert(sourceContext);
  TestValidator.equals(
    "source organization context selected",
    sourceContext.id,
    sourceOrganization.id,
  );
  const departmentName = `dept-${RandomGenerator.alphabets(8)}`;
  const departmentDescription = RandomGenerator.paragraph({ sentences: 4 });
  const sourceDepartmentBody = {
    name: departmentName,
    description: departmentDescription,
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const sourceDepartment =
    await generate_random_hrm_time_tracking_owner_departments_create(
      ownerConnection,
      {
        body: sourceDepartmentBody,
      },
    );
  typia.assert(sourceDepartment);
  TestValidator.equals(
    "department organization is source",
    sourceDepartment.organization.id,
    sourceOrganization.id,
  );
  TestValidator.equals(
    "department name matches",
    sourceDepartment.name,
    departmentName,
  );
  TestValidator.equals(
    "department description matches",
    sourceDepartment.description,
    departmentDescription,
  );
  const sourceDepartmentBefore =
    await api.functional.hrmTimeTracking.owner.departments.at(ownerConnection, {
      departmentId: sourceDepartment.id,
    });
  typia.assert(sourceDepartmentBefore);
  TestValidator.equals(
    "department id readable in source context",
    sourceDepartmentBefore.id,
    sourceDepartment.id,
  );
  TestValidator.equals(
    "department remains in source organization before cross delete",
    sourceDepartmentBefore.organization.id,
    sourceOrganization.id,
  );
  const targetOrganizationBody = {
    name: `target-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: typia.random<string & tags.Format<"uri">>(),
    currency_code: "USD",
    timezone: "UTC",
    fiscal_start_month: 2,
  } satisfies IHrmTimeTrackingOrganization.ICreate;
  const targetOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: targetOrganizationBody,
      },
    );
  typia.assert(targetOrganization);
  const targetContextBody = {
    name: `${targetOrganization.name} target`,
  } satisfies IHrmTimeTrackingOrganization.IUpdate;
  const targetContext =
    await api.functional.hrmTimeTracking.owner.organizations.update(
      ownerConnection,
      {
        organizationId: targetOrganization.id,
        body: targetContextBody,
      },
    );
  typia.assert(targetContext);
  TestValidator.equals(
    "target organization context selected",
    targetContext.id,
    targetOrganization.id,
  );
  await TestValidator.httpError(
    "cross-organization department delete is rejected",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.owner.departments.erase(
        ownerConnection,
        {
          departmentId: sourceDepartment.id,
        },
      );
    },
  );
  const restoredSourceContextBody = {
    name: sourceContext.name,
  } satisfies IHrmTimeTrackingOrganization.IUpdate;
  const restoredSourceContext =
    await api.functional.hrmTimeTracking.owner.organizations.update(
      ownerConnection,
      {
        organizationId: sourceOrganization.id,
        body: restoredSourceContextBody,
      },
    );
  typia.assert(restoredSourceContext);
  TestValidator.equals(
    "source organization context restored",
    restoredSourceContext.id,
    sourceOrganization.id,
  );
  const sourceDepartmentAfter =
    await api.functional.hrmTimeTracking.owner.departments.at(ownerConnection, {
      departmentId: sourceDepartment.id,
    });
  typia.assert(sourceDepartmentAfter);
  TestValidator.equals(
    "department id preserved after rejected cross delete",
    sourceDepartmentAfter.id,
    sourceDepartment.id,
  );
  TestValidator.equals(
    "department organization preserved after rejected cross delete",
    sourceDepartmentAfter.organization.id,
    sourceOrganization.id,
  );
  TestValidator.equals(
    "department name preserved after rejected cross delete",
    sourceDepartmentAfter.name,
    departmentName,
  );
}
