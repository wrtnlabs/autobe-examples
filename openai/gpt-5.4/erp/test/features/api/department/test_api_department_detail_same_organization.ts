import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";
import { generate_random_hrm_time_tracking_manager_departments_create } from "../../../generate/generate_random_hrm_time_tracking_manager_departments_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";

export async function test_api_department_detail_same_organization(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingManager.IJoin,
  });
  typia.assert(authorized);
  const description: string | null = RandomGenerator.paragraph({
    sentences: 3,
  });
  const created =
    await generate_random_hrm_time_tracking_manager_departments_create(
      managerConnection,
      {
        body: {
          name: `dept-${RandomGenerator.alphabets(8)}`,
          description,
        } satisfies IHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(created);
  const detail = await api.functional.hrmTimeTracking.manager.departments.at(
    managerConnection,
    {
      departmentId: created.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("department id matches", detail.id, created.id);
  TestValidator.equals("department name matches", detail.name, created.name);
  TestValidator.equals(
    "department description matches",
    detail.description,
    created.description,
  );
  TestValidator.equals("department parent is null", detail.parent, null);
  TestValidator.equals(
    "organization summary matches created resource",
    detail.organization,
    created.organization,
  );
  TestValidator.equals(
    "detail lookup returns authoritative created department",
    {
      id: detail.id,
      organization: detail.organization,
      parent: detail.parent,
      name: detail.name,
      description: detail.description,
    },
    {
      id: created.id,
      organization: created.organization,
      parent: created.parent,
      name: created.name,
      description: created.description,
    },
  );
}
