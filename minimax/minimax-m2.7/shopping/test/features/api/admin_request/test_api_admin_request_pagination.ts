import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test pagination with page=1 and limit=10
  const page1Response =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(page1Response);
  // Validate pagination metadata for page 1
  TestValidator.equals(
    "page 1 current is 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit is 10",
    page1Response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 records >= 0",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages >= 0",
    page1Response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page 1 data length <= 10",
    page1Response.data.length <= 10,
  );
  // 3. Test pagination with page=2
  const page2Response =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      adminConnection,
      {
        body: {
          page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate pagination metadata for page 2
  TestValidator.equals(
    "page 2 current is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit is 10",
    page2Response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 2 records matches page 1",
    page2Response.pagination.records,
    page1Response.pagination.records,
  );
  TestValidator.equals(
    "page 2 pages matches page 1",
    page2Response.pagination.pages,
    page1Response.pagination.pages,
  );
  // 4. Test different page size (limit=5)
  const pageSize5Response =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      adminConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(pageSize5Response);
  // Validate pagination metadata for limit=5
  TestValidator.equals(
    "limit 5 current is 1",
    pageSize5Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 5 limit is 5",
    pageSize5Response.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "limit 5 data length <= 5",
    pageSize5Response.data.length <= 5,
  );
  // 5. Test page beyond available data (empty data array)
  const beyondPageResponse =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      adminConnection,
      {
        body: {
          page: 9999 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(beyondPageResponse);
  // Validate empty page
  TestValidator.equals(
    "beyond page data is empty",
    beyondPageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "beyond page current is 9999",
    beyondPageResponse.pagination.current,
    9999,
  );
  TestValidator.equals(
    "beyond page records matches total",
    beyondPageResponse.pagination.records,
    page1Response.pagination.records,
  );
  // 6. Test default pagination (no page/limit specified)
  const defaultResponse =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Validate default pagination metadata
  TestValidator.predicate(
    "default current >= 1",
    defaultResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default limit >= 1",
    defaultResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "default records >= 0",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pages >= 0",
    defaultResponse.pagination.pages >= 0,
  );
  // 7. Verify pages calculation is correct
  if (page1Response.pagination.records > 0) {
    const expectedPages = Math.ceil(
      page1Response.pagination.records / page1Response.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation is correct",
      page1Response.pagination.pages,
      expectedPages,
    );
  }
}
