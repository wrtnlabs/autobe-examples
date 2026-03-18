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

export async function test_api_department_detail_current_organization_top_level(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const createBody = {
    name: `Department ${RandomGenerator.alphabets(8)}`,
    description: null,
  } satisfies IHrmTimeTrackingDepartment.ICreate;
  const created =
    await generate_random_hrm_time_tracking_owner_departments_create(
      ownerConnection,
      {
        body: createBody,
      },
    );
  typia.assert(created);
  const detail = await api.functional.hrmTimeTracking.owner.departments.at(
    ownerConnection,
    {
      departmentId: created.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals(
    "department id matches created resource",
    detail.id,
    created.id,
  );
  TestValidator.equals(
    "department name matches created resource",
    detail.name,
    created.name,
  );
  TestValidator.equals(
    "department description remains null",
    detail.description,
    null,
  );
  TestValidator.equals(
    "top-level department has null parent",
    detail.parent,
    null,
  );
  TestValidator.equals(
    "organization summary matches created resource",
    detail.organization,
    created.organization,
  );
}
