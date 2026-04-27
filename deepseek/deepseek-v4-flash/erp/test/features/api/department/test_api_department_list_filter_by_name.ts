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

export async function test_api_department_list_filter_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create three departments with distinct names
  const engineeringDepartment =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Engineering",
        },
      },
    );
  typia.assert(engineeringDepartment);
  const marketingDepartment =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Marketing",
        },
      },
    );
  typia.assert(marketingDepartment);
  const hrDepartment =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Human Resources",
        },
      },
    );
  typia.assert(hrDepartment);
  // 4. Search by partial name "Engine" - should return only Engineering
  const searchResult =
    await api.functional.hrmTimeTracking.member.departments.index(
      memberConnection,
      {
        body: {
          name: "Engine",
        } satisfies IHrmTimeTrackingDepartment.IRequest,
      },
    );
  typia.assert(searchResult);
  // 5. Validate: only Engineering department returned
  TestValidator.equals("search result count", searchResult.data.length, 1);
  typia.assert(searchResult.data[0]!);
  TestValidator.equals(
    "department name matches",
    searchResult.data[0]!.name,
    "Engineering",
  );
  TestValidator.equals(
    "pagination records",
    searchResult.pagination.records,
    1,
  );
  // 6. Test case-insensitivity with lowercase "engine"
  const caseInsensitiveResult =
    await api.functional.hrmTimeTracking.member.departments.index(
      memberConnection,
      {
        body: {
          name: "engine",
        } satisfies IHrmTimeTrackingDepartment.IRequest,
      },
    );
  typia.assert(caseInsensitiveResult);
  TestValidator.equals(
    "case-insensitive result count",
    caseInsensitiveResult.data.length,
    1,
  );
  typia.assert(caseInsensitiveResult.data[0]!);
  TestValidator.equals(
    "case-insensitive department name matches",
    caseInsensitiveResult.data[0]!.name,
    "Engineering",
  );
  TestValidator.equals(
    "case-insensitive pagination records",
    caseInsensitiveResult.pagination.records,
    1,
  );
}
