import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_member_listing_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Get initial member list to check current data count
  const initialList = await api.functional.erpHrm.admin.members.index(
    adminConnection,
    {
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(initialList);
  // 3. Test pagination with default sorting (createdAt DESC)
  const defaultPage = await api.functional.erpHrm.admin.members.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(defaultPage);
  TestValidator.equals("current page is 1", defaultPage.pagination.current, 1);
  TestValidator.equals("limit is 10", defaultPage.pagination.limit, 10);
  TestValidator.predicate("records >= 0", defaultPage.pagination.records >= 0);
  TestValidator.predicate("data is array", Array.isArray(defaultPage.data));
  // Validate default sorting (createdAt DESC)
  if (defaultPage.data.length > 1) {
    for (let i = 0; i < defaultPage.data.length - 1; i++) {
      const current = new Date(defaultPage.data[i].createdAt).getTime();
      const next = new Date(defaultPage.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        "default sort is createdAt DESC",
        current >= next,
      );
    }
  }
  // 4. Test sorting by displayName ascending
  const displayNameAsc = await api.functional.erpHrm.admin.members.index(
    adminConnection,
    {
      body: {
        sort: "displayName",
        order: "asc",
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(displayNameAsc);
  if (displayNameAsc.data.length > 1) {
    for (let i = 0; i < displayNameAsc.data.length - 1; i++) {
      const current = displayNameAsc.data[i].displayName;
      const next = displayNameAsc.data[i + 1].displayName;
      TestValidator.predicate(
        "displayName ascending sort",
        current.localeCompare(next) <= 0,
      );
    }
  }
  // 5. Test sorting by email descending
  const emailDesc = await api.functional.erpHrm.admin.members.index(
    adminConnection,
    {
      body: {
        sort: "email",
        order: "desc",
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(emailDesc);
  if (emailDesc.data.length > 1) {
    for (let i = 0; i < emailDesc.data.length - 1; i++) {
      const current = emailDesc.data[i].email;
      const next = emailDesc.data[i + 1].email;
      TestValidator.predicate(
        "email descending sort",
        current.localeCompare(next) >= 0,
      );
    }
  }
  // 6. Validate pagination metadata calculations
  const paginatedList = await api.functional.erpHrm.admin.members.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(paginatedList);
  TestValidator.equals(
    "current page matches request",
    paginatedList.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    paginatedList.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "total pages is positive",
    paginatedList.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    paginatedList.pagination.records >= 0,
  );
  // Verify pages calculation
  if (paginatedList.pagination.records > 0) {
    const expectedPages = Math.ceil(paginatedList.pagination.records / 5);
    TestValidator.equals(
      "pages calculation correct",
      paginatedList.pagination.pages,
      expectedPages,
    );
  }
  // 7. Test date range filtering
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeList = await api.functional.erpHrm.admin.members.index(
    adminConnection,
    {
      body: {
        createdAtFrom: oneMonthAgo.toISOString(),
        createdAtTo: tomorrow.toISOString(),
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(dateRangeList);
  // 8. Verify all returned members are within date range
  for (const member of dateRangeList.data) {
    const createdAt = new Date(member.createdAt).getTime();
    TestValidator.predicate(
      "member createdAt >= createdAtFrom",
      createdAt >= oneMonthAgo.getTime(),
    );
    TestValidator.predicate(
      "member createdAt <= createdAtTo",
      createdAt <= tomorrow.getTime(),
    );
  }
  // Additional pagination test - page 2
  const page2 = await api.functional.erpHrm.admin.members.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("current page is 2", page2.pagination.current, 2);
  TestValidator.equals("limit is 5", page2.pagination.limit, 5);
}
