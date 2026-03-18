import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingDepartment";
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

export async function test_api_department_delete_preserves_employees(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(authorized);
  const created: IHrmTimeTrackingDepartment =
    await generate_random_hrm_time_tracking_owner_departments_create(
      ownerConnection,
      {
        body: {
          name: `department-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(created);
  const beforeDetail: IHrmTimeTrackingDepartment =
    await api.functional.hrmTimeTracking.owner.departments.at(ownerConnection, {
      departmentId: created.id,
    });
  typia.assert(beforeDetail);
  TestValidator.equals(
    "department id matches created resource",
    beforeDetail.id,
    created.id,
  );
  TestValidator.equals(
    "department name matches created resource",
    beforeDetail.name,
    created.name,
  );
  TestValidator.equals(
    "department organization matches created resource",
    beforeDetail.organization.id,
    created.organization.id,
  );
  const beforeList: IPageIHrmTimeTrackingDepartment.ISummary =
    await api.functional.hrmTimeTracking.owner.departments.index(
      ownerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          name: created.name,
        } satisfies IHrmTimeTrackingDepartment.IRequest,
      },
    );
  typia.assert(beforeList);
  TestValidator.predicate(
    "department appears in list before deletion",
    ArrayUtil.has(
      beforeList.data,
      (department) => department.id === created.id,
    ),
  );
  await api.functional.hrmTimeTracking.owner.departments.erase(
    ownerConnection,
    {
      departmentId: created.id,
    },
  );
  const afterList: IPageIHrmTimeTrackingDepartment.ISummary =
    await api.functional.hrmTimeTracking.owner.departments.index(
      ownerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          name: created.name,
        } satisfies IHrmTimeTrackingDepartment.IRequest,
      },
    );
  typia.assert(afterList);
  TestValidator.predicate(
    "department removed from list after deletion",
    ArrayUtil.has(
      afterList.data,
      (department) => department.id === created.id,
    ) === false,
  );
  await TestValidator.error(
    "deleted department cannot be retrieved afterward",
    async () => {
      await api.functional.hrmTimeTracking.owner.departments.at(
        ownerConnection,
        {
          departmentId: created.id,
        },
      );
    },
  );
}
