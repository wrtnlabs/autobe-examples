import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_project_listing_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const firstPage = await api.functional.erpHrm.admin.projects.index(
    adminConnection,
    {
      body: {
        limit: 1,
        page: 1,
      } satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals("limit should be 1", firstPage.pagination.limit, 1);
  TestValidator.equals(
    "current page should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  const secondPage = await api.functional.erpHrm.admin.projects.index(
    adminConnection,
    {
      body: {
        limit: 1,
        page: 2,
      } satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "page 2 limit should be 1",
    secondPage.pagination.limit,
    1,
  );
  TestValidator.equals(
    "page 2 current should be 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "total records should match",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "total pages should match",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.notEquals(
      "page 2 should have different project",
      firstPage.data[0]!.id,
      secondPage.data[0]!.id,
    );
  }
}
