import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_organization_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Fetch first page with limit to test pagination structure
  const page1 = await api.functional.erpHrm.admin.organizations.index(
    adminConnection,
    {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IErpHrmOrganization.IRequest,
    },
  );
  typia.assert(page1);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    page1.pagination.current !== null && page1.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit",
    page1.pagination.limit !== null && page1.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has records",
    page1.pagination.records !== null && page1.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has pages",
    page1.pagination.pages !== null && page1.pagination.pages !== undefined,
  );
  // 4. Validate pagination metadata accuracy
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit matches request", page1.pagination.limit, 2);
  TestValidator.predicate(
    "records is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate("pages is non-negative", page1.pagination.pages >= 0);
  TestValidator.predicate(
    "current page is at least 0",
    page1.pagination.current >= 0,
  );
  // 5. Validate pages calculation
  const expectedPages =
    page1.pagination.records === 0
      ? 0
      : Math.ceil(page1.pagination.records / page1.pagination.limit);
  TestValidator.equals(
    "pages calculation correct",
    page1.pagination.pages,
    expectedPages,
  );
  // 6. Validate data structure
  TestValidator.predicate("data is array", Array.isArray(page1.data));
  // 7. Test pagination with different page numbers (if data exists)
  if (page1.pagination.pages > 1) {
    // If there are multiple pages, test that page 2 returns different data
    const page2 = await api.functional.erpHrm.admin.organizations.index(
      adminConnection,
      {
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IErpHrmOrganization.IRequest,
      },
    );
    typia.assert(page2);
    // Validate page 2 metadata
    TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
    TestValidator.equals(
      "page 2 records same as page 1",
      page2.pagination.records,
      page1.pagination.records,
    );
    // Ensure no duplicate data between pages
    const page1Ids = page1.data.map((org) => org.id);
    const page2Ids = page2.data.map((org) => org.id);
    for (const id of page1Ids) {
      TestValidator.predicate(
        `page 2 does not contain page 1 org ${id}`,
        !page2Ids.includes(id),
      );
    }
  }
  // 8. Test with different limit values
  const pageWithLimit3 = await api.functional.erpHrm.admin.organizations.index(
    adminConnection,
    {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 3 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IErpHrmOrganization.IRequest,
    },
  );
  typia.assert(pageWithLimit3);
  TestValidator.equals(
    "limit 3 is applied",
    pageWithLimit3.pagination.limit,
    3,
  );
  // 9. Validate pages recalculation with different limit
  const expectedPagesWithLimit3 =
    pageWithLimit3.pagination.records === 0
      ? 0
      : Math.ceil(pageWithLimit3.pagination.records / 3);
  TestValidator.equals(
    "pages recalculated with limit 3",
    pageWithLimit3.pagination.pages,
    expectedPagesWithLimit3,
  );
}
