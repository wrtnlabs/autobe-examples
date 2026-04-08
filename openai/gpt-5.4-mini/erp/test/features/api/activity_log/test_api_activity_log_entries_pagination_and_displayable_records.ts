import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeActivityLogEntry";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeActivityLogEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_entries_pagination_and_displayable_records(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `audit.${typia.random<string & tags.Format<"email">>()}`,
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const token = authorized.token.access;
  memberConnection.headers = {
    ...(memberConnection.headers ?? {}),
    Authorization: `Bearer ${token}`,
  };
  const limit = 2 as const;
  const page1 =
    await api.functional.erpHrmTime.member.activity_log_entries.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit,
        } satisfies IErpHrmTimeActivityLogEntry.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, limit);
  TestValidator.predicate(
    "page 1 count within limit",
    page1.data.length <= limit,
  );
  TestValidator.predicate(
    "page 1 displayable records are complete",
    page1.data.every(
      (entry) =>
        entry.id.length > 0 &&
        entry.actionType.length > 0 &&
        entry.targetEntityType.length > 0 &&
        entry.targetEntityId.length > 0 &&
        entry.details.length > 0 &&
        entry.createdAt.length > 0 &&
        entry.updatedAt.length > 0 &&
        entry.deletedAt === null,
    ),
  );
  TestValidator.predicate(
    "page 1 records are newest-first",
    page1.data.every(
      (entry, index, array) =>
        index === 0 || array[index - 1].createdAt >= entry.createdAt,
    ),
  );
  const page2 =
    await api.functional.erpHrmTime.member.activity_log_entries.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit,
        } satisfies IErpHrmTimeActivityLogEntry.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, limit);
  TestValidator.predicate(
    "page 2 count within limit",
    page2.data.length <= limit,
  );
  TestValidator.predicate(
    "no overlap between page 1 and page 2",
    !page1.data.some((left) =>
      page2.data.some((right) => right.id === left.id),
    ),
  );
  if (page1.data.length > 0 && page2.data.length > 0) {
    TestValidator.predicate(
      "page boundary is stable",
      page1.data[page1.data.length - 1].createdAt >= page2.data[0].createdAt,
    );
  }
  const page1Sorted =
    await api.functional.erpHrmTime.member.activity_log_entries.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit,
          sort: "-createdAt",
        } satisfies IErpHrmTimeActivityLogEntry.IRequest,
      },
    );
  typia.assert(page1Sorted);
  TestValidator.equals(
    "explicit newest-first sort matches default page 1",
    page1Sorted.data.map((entry) => entry.id),
    page1.data.map((entry) => entry.id),
  );
  const page2Sorted =
    await api.functional.erpHrmTime.member.activity_log_entries.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit,
          sort: "-createdAt",
        } satisfies IErpHrmTimeActivityLogEntry.IRequest,
      },
    );
  typia.assert(page2Sorted);
  TestValidator.equals(
    "explicit newest-first sort preserves page 2 order",
    page2Sorted.data.map((entry) => entry.id),
    page2.data.map((entry) => entry.id),
  );
  if (page2.pagination.records > 0) {
    TestValidator.equals(
      "page count calculation",
      page2.pagination.pages,
      Math.ceil(page2.pagination.records / page2.pagination.limit),
    );
  }
  const customSorted =
    await api.functional.erpHrmTime.member.activity_log_entries.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit,
          sort: "createdAt",
        } satisfies IErpHrmTimeActivityLogEntry.IRequest,
      },
    );
  typia.assert(customSorted);
  TestValidator.equals(
    "custom sort page size",
    customSorted.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "custom sort preserves displayable records",
    customSorted.data.every(
      (entry) =>
        entry.id.length > 0 &&
        entry.actionType.length > 0 &&
        entry.targetEntityType.length > 0 &&
        entry.targetEntityId.length > 0 &&
        entry.details.length > 0 &&
        entry.createdAt.length > 0 &&
        entry.updatedAt.length > 0 &&
        entry.deletedAt === null,
    ),
  );
}
