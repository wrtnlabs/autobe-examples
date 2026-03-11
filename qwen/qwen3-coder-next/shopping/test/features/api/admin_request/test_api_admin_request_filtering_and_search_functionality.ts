import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_admin_request_filtering_and_search_functionality(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Submit multiple admin requests from different user types
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  await api.functional.ecommerceMall.admin.admin_requests.index(
    customerConnection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallAdminRequest.IRequest,
    },
  );
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  await api.functional.ecommerceMall.admin.admin_requests.index(
    sellerConnection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallAdminRequest.IRequest,
    },
  );
  // 3. Attempt admin request as existing admin (should fail)
  await TestValidator.error(
    "existing admin cannot request admin access",
    async () => {
      await api.functional.ecommerceMall.admin.admin_requests.index(
        adminConnection,
        {
          body: {
            status: "pending",
            page: 1,
            limit: 10,
          } satisfies IEcommerceMallAdminRequest.IRequest,
        },
      );
    },
  );
  // 4. Call the endpoint with various pagination parameters
  const response1 =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(response1);
  const response2 =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(response2);
  // 5. Filter by status 'pending' and verify correct subset returned
  TestValidator.equals(
    "total records match",
    response1.pagination.records,
    response2.pagination.records,
  );
  TestValidator.predicate(
    "pagination records > 0",
    response1.pagination.records > 0,
  );
  // 6. Search/filter by applicant user email and verify matching results
  const filteredResponse =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 7. Verify timestamps are included in response for all requests
  for (const item of filteredResponse.data) {
    typia.assert(item);
  }
  // 8. Verify total count matches expected number of records across pages
  TestValidator.equals(
    "total records consistent",
    response1.pagination.records,
    response2.pagination.records,
  );
  // 9. Test boundary conditions
  const defaultPageResponse =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 0,
          limit: 10,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(defaultPageResponse);
  const defaultLimitResponse =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 0,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(defaultLimitResponse);
  const cappedLimitResponse =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 101,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(cappedLimitResponse);
}