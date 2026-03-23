import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_list_by_authenticated_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.hrmTracker.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. List timesheets with random filters
  const page = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;
  const response = await api.functional.hrmTracker.member.timesheets.index(
    memberConnection,
    {
      body: {
        status: RandomGenerator.pick([
          "draft",
          "submitted",
          "approved",
          "rejected",
        ] as const),
        page: page,
        limit: limit,
      } satisfies IHrmTrackerTimesheet.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate response structure
  TestValidator.equals("pagination exists", response.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit > 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // 4. Validate timesheet summaries
  response.data.forEach((timesheet) => {
    TestValidator.equals(
      "has valid employee_id",
      timesheet.employee_id,
      member.id,
    );
    TestValidator.equals("has valid status", typeof timesheet.status, "string");
    TestValidator.predicate(
      "has valid total_hours",
      typeof timesheet.total_hours === "number",
    );
    TestValidator.equals(
      "has submitted_at type",
      typeof timesheet.submitted_at,
      "string",
    );
    TestValidator.equals(
      "has reviewed_at type",
      typeof timesheet.reviewed_at,
      "string",
    );
  });
}
