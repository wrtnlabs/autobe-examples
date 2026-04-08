import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_requests_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller (pending approval)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 3. Admin approves the seller
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: sellerAuth.id },
    );
  typia.assert(approvedSeller);
  // 4. Login as the approved seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Test cancellation requests with no body (defaults)
  const emptyResult =
    await api.functional.ecommerceMall.seller.sellers.me.cancellation_requests.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Validate empty data array
  TestValidator.equals(
    "data array should be empty",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals("data should be empty array", emptyResult.data, []);
  // Validate pagination metadata
  TestValidator.equals(
    "records should be 0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("pages should be 0", emptyResult.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 1 (default)",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be default (100)",
    emptyResult.pagination.limit,
    100,
  );
  // 6. Test with explicit page 1 and limit 20
  const pageResult =
    await api.functional.ecommerceMall.seller.sellers.me.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pageResult);
  TestValidator.equals(
    "data should be empty on page 1",
    pageResult.data.length,
    0,
  );
  TestValidator.equals("records should be 0", pageResult.pagination.records, 0);
  TestValidator.equals("pages should be 0", pageResult.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 1",
    pageResult.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 20", pageResult.pagination.limit, 20);
  // 7. Test with page 2 (beyond available data)
  const page2Result =
    await api.functional.ecommerceMall.seller.sellers.me.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "data should be empty on page 2",
    page2Result.data.length,
    0,
  );
  TestValidator.equals(
    "records should be 0",
    page2Result.pagination.records,
    0,
  );
  TestValidator.equals("pages should be 0", page2Result.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("limit should be 10", page2Result.pagination.limit, 10);
  // 8. Test with status filter - pending
  const pendingResult =
    await api.functional.ecommerceMall.seller.sellers.me.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.equals(
    "data should be empty for pending filter",
    pendingResult.data.length,
    0,
  );
  TestValidator.equals(
    "records should be 0 for pending",
    pendingResult.pagination.records,
    0,
  );
  // 9. Test with status filter - approved
  const approvedResult =
    await api.functional.ecommerceMall.seller.sellers.me.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.equals(
    "data should be empty for approved filter",
    approvedResult.data.length,
    0,
  );
  TestValidator.equals(
    "records should be 0 for approved",
    approvedResult.pagination.records,
    0,
  );
  // 10. Test with status filter - rejected
  const rejectedResult =
    await api.functional.ecommerceMall.seller.sellers.me.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  TestValidator.equals(
    "data should be empty for rejected filter",
    rejectedResult.data.length,
    0,
  );
  TestValidator.equals(
    "records should be 0 for rejected",
    rejectedResult.pagination.records,
    0,
  );
  // 11. Test with null page and limit (explicit null values)
  const nullPageResult =
    await api.functional.ecommerceMall.seller.sellers.me.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          page: null,
          limit: null,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(nullPageResult);
  TestValidator.equals(
    "data should be empty with null pagination",
    nullPageResult.data.length,
    0,
  );
  TestValidator.equals(
    "records should be 0",
    nullPageResult.pagination.records,
    0,
  );
  TestValidator.equals("pages should be 0", nullPageResult.pagination.pages, 0);
}
