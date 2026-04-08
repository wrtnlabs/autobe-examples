import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import type { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_browse_by_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const makeJoinBody = (
    email: string,
    displayName: string,
  ): IErpHrmTimeMember.IJoin => ({
    email,
    password: `Pw${RandomGenerator.alphaNumeric(10)}!`,
    displayName,
    avatarImageUrl: null,
    phoneNumber: null,
    href: "https://example.com/signup",
    referrer: "https://example.com",
  });
  const primaryAuth = await authorize_member_join(
    { host: connection.host },
    {
      body: makeJoinBody(
        `member_${typia.random<string & tags.Format<"uuid">>()}@example.com`,
        RandomGenerator.name(),
      ),
    },
  );
  typia.assert(primaryAuth);
  const secondaryAuth = await authorize_member_join(
    { host: connection.host },
    {
      body: makeJoinBody(
        `member_${typia.random<string & tags.Format<"uuid">>()}@example.com`,
        RandomGenerator.name(),
      ),
    },
  );
  typia.assert(secondaryAuth);
  const primaryConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: primaryAuth.token.access,
    },
  };
  const secondaryConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: secondaryAuth.token.access,
    },
  };
  const primaryList = await api.functional.erpHrmTime.member.timelogs.index(
    primaryConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IErpHrmTimeTimelog.IRequest,
    },
  );
  typia.assert(primaryList);
  const secondaryList = await api.functional.erpHrmTime.member.timelogs.index(
    secondaryConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IErpHrmTimeTimelog.IRequest,
    },
  );
  typia.assert(secondaryList);
  TestValidator.predicate(
    "primary pagination is valid",
    primaryList.pagination.current >= 1 &&
      primaryList.pagination.limit >= 1 &&
      primaryList.pagination.pages >= 0 &&
      primaryList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "secondary pagination is valid",
    secondaryList.pagination.current >= 1 &&
      secondaryList.pagination.limit >= 1 &&
      secondaryList.pagination.pages >= 0 &&
      secondaryList.pagination.records >= 0,
  );
  TestValidator.notEquals(
    "different member contexts should not leak identical timelog pages",
    primaryList.data,
    secondaryList.data,
  );
  const validateTimelogSummaries = (
    items: IErpHrmTimeTimelog.ISummary[],
  ): void => {
    for (const item of items) {
      typia.assert(item);
      TestValidator.predicate("timelog id is present", item.id.length > 0);
      TestValidator.predicate(
        "timelog duration is non-negative",
        item.durationMinutes >= 0,
      );
      TestValidator.predicate(
        "timelog has work date",
        item.workDate.length > 0,
      );
      TestValidator.predicate(
        "timelog has createdAt",
        item.createdAt.length > 0,
      );
      TestValidator.predicate(
        "timelog has updatedAt",
        item.updatedAt.length > 0,
      );
      TestValidator.predicate(
        "timelog billable is boolean",
        typeof item.billable === "boolean",
      );
    }
  };
  validateTimelogSummaries(primaryList.data);
  validateTimelogSummaries(secondaryList.data);
  const billableOnly = await api.functional.erpHrmTime.member.timelogs.index(
    primaryConnection,
    {
      body: {
        page: 1,
        limit: 20,
        billable: true,
      } satisfies IErpHrmTimeTimelog.IRequest,
    },
  );
  typia.assert(billableOnly);
  validateTimelogSummaries(billableOnly.data);
  const nonBillableOnly = await api.functional.erpHrmTime.member.timelogs.index(
    primaryConnection,
    {
      body: {
        page: 1,
        limit: 20,
        billable: false,
      } satisfies IErpHrmTimeTimelog.IRequest,
    },
  );
  typia.assert(nonBillableOnly);
  validateTimelogSummaries(nonBillableOnly.data);
  const dateFiltered = await api.functional.erpHrmTime.member.timelogs.index(
    primaryConnection,
    {
      body: {
        page: 1,
        limit: 20,
        workDateFrom: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)
          .toISOString()
          .slice(0, 10),
        workDateTo: new Date().toISOString().slice(0, 10),
      } satisfies IErpHrmTimeTimelog.IRequest,
    },
  );
  typia.assert(dateFiltered);
  validateTimelogSummaries(dateFiltered.data);
  const searchFiltered = await api.functional.erpHrmTime.member.timelogs.index(
    primaryConnection,
    {
      body: {
        page: 1,
        limit: 20,
        search: primaryAuth.displayName,
      } satisfies IErpHrmTimeTimelog.IRequest,
    },
  );
  typia.assert(searchFiltered);
  validateTimelogSummaries(searchFiltered.data);
  TestValidator.equals(
    "pagination limit is echoed",
    primaryList.pagination.limit,
    20,
  );
  TestValidator.equals(
    "filtered pagination limit is echoed",
    billableOnly.pagination.limit,
    20,
  );
}
