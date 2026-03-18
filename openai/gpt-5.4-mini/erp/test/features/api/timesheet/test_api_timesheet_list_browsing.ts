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

export async function test_api_timesheet_list_browsing(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const browsingConnection: api.IConnection = { host: connection.host };
  browsingConnection.headers = { Authorization: authorized.token.access };
  const organization =
    await api.functional.hrmTimeTracking.member.organizations.create(
      browsingConnection,
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
  const page = await api.functional.hrmTimeTracking.member.timesheets.index(
    browsingConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "-weekStart",
      } satisfies IHrmTimeTrackingTimesheet.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "pagination current should be 1 on first page",
    page.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    page.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination should be coherent",
    page.pagination.records >= 0 && page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned page size should not exceed limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate(
    "all timesheets must belong to the active organization",
    page.data.every((item) => item.organization.id === organization.id),
  );
  TestValidator.predicate(
    "all timesheets must be weekly periods starting Monday and ending Sunday",
    page.data.every((item) => {
      const weekStart = new Date(item.weekStart);
      const weekEnd = new Date(item.weekEnd);
      return weekStart.getUTCDay() === 1 && weekEnd.getUTCDay() === 0;
    }),
  );
  if (page.data.length > 0) {
    const firstStatus = page.data[0].status;
    const filteredByStatus =
      await api.functional.hrmTimeTracking.member.timesheets.index(
        browsingConnection,
        {
          body: {
            page: 1,
            limit: 10,
            status: firstStatus,
            sort: "-weekStart",
          } satisfies IHrmTimeTrackingTimesheet.IRequest,
        },
      );
    typia.assert(filteredByStatus);
    TestValidator.predicate(
      "status filter should return only matching status values",
      filteredByStatus.data.every((item) => item.status === firstStatus),
    );
    const firstWeekStart = page.data[0].weekStart;
    const firstWeekEnd = page.data[0].weekEnd;
    const filteredByWeekRange =
      await api.functional.hrmTimeTracking.member.timesheets.index(
        browsingConnection,
        {
          body: {
            page: 1,
            limit: 10,
            weekStart: firstWeekStart,
            weekEnd: firstWeekEnd,
            sort: "-weekStart",
          } satisfies IHrmTimeTrackingTimesheet.IRequest,
        },
      );
    typia.assert(filteredByWeekRange);
    TestValidator.predicate(
      "week range filter should constrain results to the requested weekly period",
      filteredByWeekRange.data.every(
        (item) =>
          item.weekStart >= firstWeekStart && item.weekEnd <= firstWeekEnd,
      ),
    );
  }
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondAuthorized = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const secondBrowsingConnection: api.IConnection = { host: connection.host };
  secondBrowsingConnection.headers = {
    Authorization: secondAuthorized.token.access,
  };
  const secondOrganization =
    await api.functional.hrmTimeTracking.member.organizations.create(
      secondBrowsingConnection,
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
  typia.assert(secondOrganization);
  const secondPage =
    await api.functional.hrmTimeTracking.member.timesheets.index(
      secondBrowsingConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "-weekStart",
        } satisfies IHrmTimeTrackingTimesheet.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.predicate(
    "organization scoping should not leak records across members",
    secondPage.data.every(
      (item) => item.organization.id === secondOrganization.id,
    ),
  );
}
