import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_departments_create } from "../../../generate/generate_random_hrm_time_tracking_member_departments_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_department_list_with_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member (authentication)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization
  await generate_random_hrm_time_tracking_member_organizations_create(
    memberConnection,
    {},
  );
  // 3. Create a top-level department (Engineering)
  const engineering =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Engineering",
        } satisfies DeepPartial<IHrmTimeTrackingDepartment.ICreate>,
      },
    );
  typia.assert(engineering);
  // 4. Create a child department (Frontend) under Engineering
  const frontend =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Frontend",
          parentId: engineering.id,
        } satisfies DeepPartial<IHrmTimeTrackingDepartment.ICreate>,
      },
    );
  typia.assert(frontend);
  // 5. Retrieve department list without filters
  const page = await api.functional.hrmTimeTracking.member.departments.index(
    memberConnection,
    {
      body: {} satisfies IHrmTimeTrackingDepartment.IRequest,
    },
  );
  typia.assert(page);
  // 6. Validate both departments are present
  TestValidator.equals("total records count", page.pagination.records, 2);
  TestValidator.predicate("engineering department exists", () =>
    page.data.some((d) => d.id === engineering.id),
  );
  TestValidator.predicate("frontend department exists", () =>
    page.data.some((d) => d.id === frontend.id),
  );
  // 7. Validate child department's parent reference
  const frontendInResponse = page.data.find((d) => d.id === frontend.id)!;
  TestValidator.equals(
    "frontend parent id",
    frontendInResponse.parent!.id,
    engineering.id,
  );
  TestValidator.equals(
    "frontend parent name",
    frontendInResponse.parent!.name,
    "Engineering",
  );
  // 8. Validate Engineering department's children count
  const engineeringInResponse = page.data.find((d) => d.id === engineering.id)!;
  TestValidator.equals(
    "engineering children count",
    engineeringInResponse.children_count,
    1,
  );
  // 9. Validate pagination metadata
  TestValidator.equals("current page", page.pagination.current, 1);
  TestValidator.equals("pages count", page.pagination.pages, 1);
}
