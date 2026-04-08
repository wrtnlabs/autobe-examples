import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestOfCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_request_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create multiple admin requests (test data for pagination)
  const requestCount = 12;
  await ArrayUtil.asyncRepeat(requestCount, async () => {
    const requestConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(requestConnection, {
      body: {
        actorType: "customer",
        requestedGrade: "admin",
        reason: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  });
  // 3. Test pagination with limit=5, page=1
  const page1Response =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 current should be 1",
    page1Response.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit should be 5",
    page1Response.pagination.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 1 records should be 12",
    page1Response.pagination.pagination.records,
    12,
  );
  TestValidator.equals(
    "page 1 pages should be 3",
    page1Response.pagination.pagination.pages,
    3,
  );
  TestValidator.equals(
    "page 1 data length should be 5",
    page1Response.data.length,
    5,
  );
  // 4. Test pagination with limit=5, page=2
  const page2Response =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 current should be 2",
    page2Response.pagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit should be 5",
    page2Response.pagination.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 2 records should be 12",
    page2Response.pagination.pagination.records,
    12,
  );
  TestValidator.equals(
    "page 2 pages should be 3",
    page2Response.pagination.pagination.pages,
    3,
  );
  TestValidator.equals(
    "page 2 data length should be 5",
    page2Response.data.length,
    5,
  );
  // 5. Test pagination with limit=5, page=3 (last page)
  const page3Response =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          page: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(page3Response);
  TestValidator.equals(
    "page 3 current should be 3",
    page3Response.pagination.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3 limit should be 5",
    page3Response.pagination.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 3 records should be 12",
    page3Response.pagination.pagination.records,
    12,
  );
  TestValidator.equals(
    "page 3 pages should be 3",
    page3Response.pagination.pagination.pages,
    3,
  );
  TestValidator.equals(
    "page 3 data length should be 2 (remaining items)",
    page3Response.data.length,
    2,
  );
  // 6. Test pagination with limit=10
  const page10Response =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(page10Response);
  TestValidator.equals(
    "limit 10 current should be 1",
    page10Response.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 10 limit should be 10",
    page10Response.pagination.pagination.limit,
    10,
  );
  TestValidator.equals(
    "limit 10 records should be 12",
    page10Response.pagination.pagination.records,
    12,
  );
  TestValidator.equals(
    "limit 10 pages should be 2",
    page10Response.pagination.pagination.pages,
    2,
  );
  TestValidator.equals(
    "limit 10 data length should be 10",
    page10Response.data.length,
    10,
  );
  // 7. Test pagination with limit=10, page=2 (last page)
  const page10Page2Response =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(page10Page2Response);
  TestValidator.equals(
    "page 2 limit 10 current should be 2",
    page10Page2Response.pagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit 10 data length should be 2 (remaining items)",
    page10Page2Response.data.length,
    2,
  );
  // 8. Validate that different pages return different data (no overlap)
  const page1Ids = page1Response.data.map((r) => r.id);
  const page2Ids = page2Response.data.map((r) => r.id);
  const page3Ids = page3Response.data.map((r) => r.id);
  const allIds = [...page1Ids, ...page2Ids, ...page3Ids];
  const uniqueIds = new Set(allIds);
  TestValidator.equals(
    "all page IDs should be unique",
    allIds.length,
    uniqueIds.size,
  );
}
