import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_seller_admin_request_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  // 2. Test page 1 with limit 10
  const firstPage =
    await api.functional.ecommerceMall.superAdmin.seller.admin_requests.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("limit matches request", firstPage.pagination.limit, 10);
  TestValidator.predicate("data length <= 10", firstPage.data.length <= 10);
  // 3. Test page beyond available records returns empty data with correct pagination
  const emptyPage =
    await api.functional.ecommerceMall.superAdmin.seller.admin_requests.index(
      superAdminConnection,
      {
        body: {
          page: 999,
          limit: 10,
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty page current", emptyPage.pagination.current, 999);
  TestValidator.equals(
    "empty page data is empty array",
    emptyPage.data.length,
    0,
  );
  // 4. Test page 1 with limit 1
  const pageLimit1 =
    await api.functional.ecommerceMall.superAdmin.seller.admin_requests.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(pageLimit1);
  TestValidator.equals("page 1 current", pageLimit1.pagination.current, 1);
  TestValidator.equals("limit is 1", pageLimit1.pagination.limit, 1);
  TestValidator.predicate("data length <= 1", pageLimit1.data.length <= 1);
  // 5. Test pagination with limit 5
  const pageWithLimit5 =
    await api.functional.ecommerceMall.superAdmin.seller.admin_requests.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallSellerAdminRequest.IRequest,
      },
    );
  typia.assert(pageWithLimit5);
  TestValidator.equals(
    "page with limit 5 current",
    pageWithLimit5.pagination.current,
    1,
  );
  TestValidator.equals(
    "page with limit 5 limit",
    pageWithLimit5.pagination.limit,
    5,
  );
  TestValidator.predicate("data length <= 5", pageWithLimit5.data.length <= 5);
}
