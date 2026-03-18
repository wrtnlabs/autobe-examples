import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployee";
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

export async function test_api_employee_directory_browse_with_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/hrm/owners/join",
      referrer: "https://example.com/hrm",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: "https://example.com/assets/logo.png",
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  const request = {
    search: RandomGenerator.name(1),
    employmentType: "full_time",
    employeeStatus: "active",
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingEmployee.IRequest;
  const directory = await api.functional.hrmTimeTracking.employees.index(
    ownerConnection,
    {
      body: request,
    },
  );
  typia.assert(directory);
  TestValidator.equals(
    "current page matches requested page",
    directory.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    directory.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "total pages formula is respected",
    directory.pagination.pages,
    directory.pagination.limit === 0
      ? 0
      : Math.ceil(directory.pagination.records / directory.pagination.limit),
  );
  TestValidator.predicate(
    "returned data length does not exceed response page limit",
    directory.data.length <= directory.pagination.limit,
  );
  TestValidator.predicate(
    "returned data length does not exceed requested limit",
    directory.data.length <= (request.limit ?? directory.data.length),
  );
  TestValidator.predicate(
    "pagination current is non-negative",
    directory.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination record count is non-negative",
    directory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    directory.pagination.pages >= 0,
  );
  for (const employee of directory.data) {
    typia.assert(employee);
    TestValidator.predicate(
      "employee summary has only documented fields",
      typia.equals<IHrmTimeTrackingEmployee.ISummary>(employee),
    );
    const record = employee as unknown as Record<string, unknown>;
    TestValidator.equals(
      "credential material is not exposed: password",
      Object.prototype.hasOwnProperty.call(record, "password"),
      false,
    );
    TestValidator.equals(
      "credential material is not exposed: password_hash",
      Object.prototype.hasOwnProperty.call(record, "password_hash"),
      false,
    );
    TestValidator.equals(
      "credential material is not exposed: token",
      Object.prototype.hasOwnProperty.call(record, "token"),
      false,
    );
    TestValidator.equals(
      "unrelated detail data is not exposed: organization",
      Object.prototype.hasOwnProperty.call(record, "organization"),
      false,
    );
  }
  const ids = directory.data.map((employee) => employee.id);
  TestValidator.equals(
    "employee ids are unique within page",
    new Set(ids).size,
    ids.length,
  );
}
