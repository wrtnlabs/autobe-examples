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
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";

export async function test_api_department_detail_organization_scope_not_exposed(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const created =
    await generate_random_hrm_time_tracking_owner_departments_create(
      ownerConnection,
      {
        body: {
          name: `dept-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(created);
  const found = await api.functional.hrmTimeTracking.owner.departments.at(
    ownerConnection,
    {
      departmentId: created.id,
    },
  );
  typia.assert(found);
  TestValidator.equals(
    "retrieved department id matches created",
    found.id,
    created.id,
  );
  TestValidator.equals(
    "retrieved department name matches created",
    found.name,
    created.name,
  );
  TestValidator.equals(
    "retrieved department organization matches created",
    found.organization.id,
    created.organization.id,
  );
  const outOfScopeDepartmentId = typia.assert<string & tags.Format<"uuid">>(
    [
      typia.random<string & tags.Format<"uuid">>(),
      typia.random<string & tags.Format<"uuid">>(),
      typia.random<string & tags.Format<"uuid">>(),
    ].find((id) => id !== created.id),
  );
  await TestValidator.httpError(
    "department detail outside current organization scope is not exposed",
    [404, 403],
    async () => {
      await api.functional.hrmTimeTracking.owner.departments.at(
        ownerConnection,
        {
          departmentId: outOfScopeDepartmentId,
        },
      );
    },
  );
}
