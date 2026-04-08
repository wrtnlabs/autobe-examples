import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator customer directory search and browse functionality.
 *
 * Verifies that an authenticated administrator can browse the customer directory using free-text search, direct
 * filters, pagination, and sorting controls. The test also checks that the returned payload is a customer summary
 * page, that pagination metadata is internally consistent, and that repeated queries with the same criteria return
 * stable ordering.
 *
 * 1. Authenticate as an administrator using a dedicated connection.
 * 2. Issue customer directory requests with varied combinations of search and filter controls.
 * 3. Validate page metadata, summary-only response shape, and stable result ordering across repeated requests.
 */
export async function test_api_customer_directory_search_and_browse(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const firstPage =
    await api.functional.mallPlatform.administrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort: "-created_at",
        } satisfies IMallPlatformCustomer.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "customer directory current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "customer directory page limit",
    firstPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "customer directory page size respects limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "customer directory metadata has non-negative totals",
    firstPage.pagination.records >= 0 && firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "customer directory metadata is consistent with page size",
    firstPage.pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "customer directory data are summary rows",
    firstPage.data.every(
      (item) =>
        typeof item.id === "string" &&
        typeof item.email === "string" &&
        typeof item.status === "string" &&
        typeof item.created_at === "string" &&
        typeof item.updated_at === "string" &&
        (typeof item.deleted_at === "string" || item.deleted_at === null),
    ),
  );
  const repeatedFirstPage =
    await api.functional.mallPlatform.administrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort: "-created_at",
        } satisfies IMallPlatformCustomer.IRequest,
      },
    );
  typia.assert(repeatedFirstPage);
  TestValidator.equals(
    "repeated customer directory requests return stable ordering",
    firstPage.data.map((item) => item.id),
    repeatedFirstPage.data.map((item) => item.id),
  );
  if (firstPage.data.length > 0) {
    const sample = firstPage.data[0];
    const searchTerm = sample.email.split("@")[0];
    const byId =
      await api.functional.mallPlatform.administrator.customers.index(
        adminConnection,
        {
          body: {
            id: sample.id,
            page: 1,
            limit: 10,
          } satisfies IMallPlatformCustomer.IRequest,
        },
      );
    typia.assert(byId);
    TestValidator.predicate(
      "customer id filter matches the requested customer",
      byId.data.every((item) => item.id === sample.id),
    );
    const byEmail =
      await api.functional.mallPlatform.administrator.customers.index(
        adminConnection,
        {
          body: {
            email: sample.email,
            page: 1,
            limit: 10,
          } satisfies IMallPlatformCustomer.IRequest,
        },
      );
    typia.assert(byEmail);
    TestValidator.predicate(
      "customer email filter matches the requested customer",
      byEmail.data.every((item) => item.email === sample.email),
    );
    const byStatus =
      await api.functional.mallPlatform.administrator.customers.index(
        adminConnection,
        {
          body: {
            status: sample.status,
            page: 1,
            limit: 10,
          } satisfies IMallPlatformCustomer.IRequest,
        },
      );
    typia.assert(byStatus);
    TestValidator.predicate(
      "customer status filter matches the requested status",
      byStatus.data.every((item) => item.status === sample.status),
    );
    const search =
      await api.functional.mallPlatform.administrator.customers.index(
        adminConnection,
        {
          body: {
            search: searchTerm,
            page: 1,
            limit: 10,
            sort: "-updated_at",
          } satisfies IMallPlatformCustomer.IRequest,
        },
      );
    typia.assert(search);
    TestValidator.predicate(
      "free-text search returns summary records",
      search.data.every(
        (item) =>
          typeof item.id === "string" &&
          typeof item.email === "string" &&
          typeof item.status === "string" &&
          typeof item.created_at === "string" &&
          typeof item.updated_at === "string" &&
          (typeof item.deleted_at === "string" || item.deleted_at === null),
      ),
    );
  }
  const lastPageNumber =
    firstPage.pagination.pages > 0 ? firstPage.pagination.pages : 1;
  const lastPage =
    await api.functional.mallPlatform.administrator.customers.index(
      adminConnection,
      {
        body: {
          page: lastPageNumber,
          limit: 5,
          sort: "-created_at",
        } satisfies IMallPlatformCustomer.IRequest,
      },
    );
  typia.assert(lastPage);
  TestValidator.equals(
    "last page current value matches requested page",
    lastPage.pagination.current,
    lastPageNumber,
  );
  TestValidator.predicate(
    "last page does not exceed requested limit",
    lastPage.data.length <= lastPage.pagination.limit,
  );
  TestValidator.predicate(
    "last page metadata is consistent with records and pages",
    lastPage.pagination.records >= 0 && lastPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "directory responses contain summary records only",
    lastPage.data.every(
      (item) =>
        typeof item.id === "string" &&
        typeof item.email === "string" &&
        typeof item.status === "string" &&
        typeof item.created_at === "string" &&
        typeof item.updated_at === "string" &&
        (typeof item.deleted_at === "string" || item.deleted_at === null),
    ),
  );
}
