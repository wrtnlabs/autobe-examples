import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRole";
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
import { generate_random_ecommerce_mall_admin_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request";

export async function test_api_admin_request_listing_with_pagination_and_status_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const adminToken = typeof adminConnection.headers?.Authorization === "string" ? adminConnection.headers?.Authorization?.split(" ")[1] : null;
  if (!adminToken) throw new Error("Admin token not set");
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminToken,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create customer1 and submit admin request
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const customer1Token = typeof customer1Connection.headers?.Authorization === "string" ? customer1Connection.headers?.Authorization?.split(" ")[1] : null;
  if (!customer1Token) throw new Error("Customer1 token not set");
  await authorize_customer_login(customer1Connection, {
    body: {
      email: customer1Token,
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost/",
      referrer: "http://localhost/",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  const customer1Request =
    await api.functional.ecommerceMall.admin.admin_requests.create(
      customer1Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallAdminRequest.ICreate,
      },
    );
  typia.assert(customer1Request);
  // 3. Create seller1 and submit admin request
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const seller1Token = typeof seller1Connection.headers?.Authorization === "string" ? seller1Connection.headers?.Authorization?.split(" ")[1] : null;
  if (!seller1Token) throw new Error("Seller1 token not set");
  await authorize_seller_login(seller1Connection, {
    body: {
      email: seller1Token,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const seller1Request =
    await api.functional.ecommerceMall.admin.admin_requests.create(
      seller1Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallAdminRequest.ICreate,
      },
    );
  typia.assert(seller1Request);
  // 4. Test listing with status='pending' filter
  const pendingResult =
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
  typia.assert(pendingResult);
  TestValidator.equals(
    "pending result contains both requests",
    pendingResult.data.length,
    2,
  );
  TestValidator.predicate("all pending", () =>
    pendingResult.data.every((r) => r.status === "pending"),
  );
  // 5. Test pagination with smaller limit
  const paginatedResult =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.data.length,
    1,
  );
  TestValidator.equals(
    "pagination metadata",
    paginatedResult.pagination.limit,
    1,
  );
  // 6. Test status='approved' filter (empty initially)
  const approvedResult =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.equals(
    "approved initially empty",
    approvedResult.data.length,
    0,
  );
  // 7. Test status='rejected' filter (empty initially)
  const rejectedResult =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  TestValidator.equals(
    "rejected initially empty",
    rejectedResult.data.length,
    0,
  );
  // 8. Approve one request and test approved filter
  const approvedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.update(
      adminConnection,
      {
        adminRequestId: customer1Request.id,
        body: {
          status: "approved",
          approval_notes: "Approved for testing purposes",
          rejection_reason: null,
        } satisfies IEcommerceMallAdminRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals("request approved", approvedRequest.status, "approved");
  const approvedResultAfter =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(approvedResultAfter);
  TestValidator.equals(
    "approved result contains approved request",
    approvedResultAfter.data.length,
    1,
  );
  TestValidator.equals(
    "approved result has correct status",
    approvedResultAfter.data[0].status,
    "approved",
  );
  // 9. Reject another request and test rejected filter
  const rejectedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.update(
      adminConnection,
      {
        adminRequestId: seller1Request.id,
        body: {
          status: "rejected",
          approval_notes: null,
          rejection_reason: "Insufficient justification",
        } satisfies IEcommerceMallAdminRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals("request rejected", rejectedRequest.status, "rejected");
  const rejectedResultAfter =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(rejectedResultAfter);
  TestValidator.equals(
    "rejected result contains rejected request",
    rejectedResultAfter.data.length,
    1,
  );
  TestValidator.equals(
    "rejected result has correct status",
    rejectedResultAfter.data[0].status,
    "rejected",
  );
  // 10. Test unauthorized access (customer cannot access admin endpoint)
  await TestValidator.error(
    "customer cannot access admin requests",
    async () => {
      await api.functional.ecommerceMall.admin.admin_requests.index(
        customer1Connection,
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
}