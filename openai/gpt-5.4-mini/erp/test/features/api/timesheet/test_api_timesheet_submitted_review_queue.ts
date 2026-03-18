import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_timesheet_submitted_review_queue(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const request = {
    status: "submitted",
    page: 1,
    limit: 20,
    sort: "-weekStart",
  } satisfies IHrmTimeTrackingTimesheet.IRequest;
  const reviewQueue =
    await api.functional.hrmTimeTracking.member.timesheets.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(reviewQueue);
  const reviewQueueAgain =
    await api.functional.hrmTimeTracking.member.timesheets.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(reviewQueueAgain);
  TestValidator.equals("requested page", reviewQueue.pagination.current, 1);
  TestValidator.equals("requested limit", reviewQueue.pagination.limit, 20);
  TestValidator.equals(
    "stable pagination metadata",
    reviewQueue.pagination,
    reviewQueueAgain.pagination,
  );
  TestValidator.equals(
    "stable first page data",
    reviewQueue.data,
    reviewQueueAgain.data,
  );
  TestValidator.predicate(
    "all records belong to active organization",
    reviewQueue.data.every((item) => item.organization.id === organization.id),
  );
  TestValidator.predicate(
    "all records are submitted",
    reviewQueue.data.every((item) => item.status === "submitted"),
  );
  TestValidator.predicate(
    "review metadata is internally consistent when present",
    reviewQueue.data.every(
      (item) => item.reviewedByEmployee === null || item.reviewedAt !== null,
    ),
  );
  const secondPage =
    await api.functional.hrmTimeTracking.member.timesheets.index(
      memberConnection,
      {
        body: {
          ...request,
          page: 2,
        } satisfies IHrmTimeTrackingTimesheet.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "stable pagination limit",
    secondPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pages are non-negative",
    reviewQueue.pagination.pages >= 0 && secondPage.pagination.pages >= 0,
  );
}
