import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_assigned_projects_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const request = {
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingProject.IRequest;
  const page1 =
    await api.functional.hrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(page1);
  const page1Repeat =
    await api.functional.hrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(page1Repeat);
  TestValidator.equals(
    "page 1 is stable across repeated calls",
    page1Repeat,
    page1,
  );
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit respected", page1.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 records are non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages are non-negative",
    page1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page 1 data does not exceed limit",
    page1.data.length <= page1.pagination.limit,
  );
  const page2Request = {
    page: 2,
    limit: 10,
  } satisfies IHrmTimeTrackingProject.IRequest;
  const page2 =
    await api.functional.hrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      {
        body: page2Request,
      },
    );
  typia.assert(page2);
  const page2Repeat =
    await api.functional.hrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      {
        body: page2Request,
      },
    );
  typia.assert(page2Repeat);
  TestValidator.equals(
    "page 2 is stable across repeated calls",
    page2Repeat,
    page2,
  );
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals(
    "page 2 limit matches request",
    page2.pagination.limit,
    10,
  );
  TestValidator.equals(
    "record count stays stable across pages",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page count stays stable across pages",
    page2.pagination.pages,
    page1.pagination.pages,
  );
  TestValidator.predicate(
    "page 2 data does not exceed limit",
    page2.data.length <= page2.pagination.limit,
  );
  const combined = [...page1.data, ...page2.data];
  const uniqueIds = new Set(combined.map((project) => project.id));
  TestValidator.equals(
    "project ids are unique across first two pages",
    uniqueIds.size,
    combined.length,
  );
  if (page1.data.length > 0 && page2.data.length > 0) {
    TestValidator.notEquals(
      "pagination should advance to a different project between pages when available",
      page1.data[page1.data.length - 1].id,
      page2.data[0].id,
    );
  }
}
