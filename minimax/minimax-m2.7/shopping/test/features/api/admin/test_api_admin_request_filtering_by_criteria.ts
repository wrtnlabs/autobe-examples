import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_request_filtering_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin to manage requests
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SuperAdmin123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 2. Create customers who will submit admin requests
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Customer123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Customer123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 3. Create sellers who will submit admin requests
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 4. Submit admin requests with different combinations
  // Customer 1 requests admin
  await api.functional.ecommerceMall.auth.admin.request.join(
    customer1Connection,
    {
      body: {
        actorType: "customer",
        requestedGrade: "admin",
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  // Customer 2 requests super_admin
  await api.functional.ecommerceMall.auth.admin.request.join(
    customer2Connection,
    {
      body: {
        actorType: "customer",
        requestedGrade: "super_admin",
        reason: RandomGenerator.paragraph({ sentences: 4 }),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  // Seller 1 requests admin
  await api.functional.ecommerceMall.auth.admin.request.join(
    seller1Connection,
    {
      body: {
        actorType: "seller",
        requestedGrade: "admin",
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  // Seller 2 requests super_admin
  await api.functional.ecommerceMall.auth.admin.request.join(
    seller2Connection,
    {
      body: {
        actorType: "seller",
        requestedGrade: "super_admin",
        reason: RandomGenerator.paragraph({ sentences: 4 }),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  // 5. Get all requests first to verify we have all types
  const allRequestsResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(allRequestsResult);
  TestValidator.equals(
    "total requests should be 4",
    allRequestsResult.data.length,
    4,
  );
  // 6. Filter by status='pending' only
  const pendingResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.equals(
    "pending filter should return all pending requests",
    pendingResult.data.length,
    4,
  );
  for (const request of pendingResult.data) {
    TestValidator.equals(
      "each request should be pending",
      request.status,
      "pending",
    );
  }
  // 7. Filter by actorType='customer' only
  const customerActorResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          actorType: "customer",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(customerActorResult);
  TestValidator.equals(
    "customer filter should return 2 requests",
    customerActorResult.data.length,
    2,
  );
  for (const request of customerActorResult.data) {
    TestValidator.equals(
      "each request should be from customer actor",
      request.actorType,
      "customer",
    );
  }
  // 8. Filter by actorType='seller' only
  const sellerActorResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          actorType: "seller",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(sellerActorResult);
  TestValidator.equals(
    "seller filter should return 2 requests",
    sellerActorResult.data.length,
    2,
  );
  for (const request of sellerActorResult.data) {
    TestValidator.equals(
      "each request should be from seller actor",
      request.actorType,
      "seller",
    );
  }
  // 9. Filter by requestedGrade='admin' only
  const adminGradeResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          requestedGrade: "admin",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(adminGradeResult);
  TestValidator.equals(
    "admin grade filter should return 2 requests",
    adminGradeResult.data.length,
    2,
  );
  for (const request of adminGradeResult.data) {
    TestValidator.equals(
      "each request should be for admin grade",
      request.requestedGrade,
      "admin",
    );
  }
  // 10. Filter by requestedGrade='super_admin' only
  const superAdminGradeResult =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          requestedGrade: "super_admin",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(superAdminGradeResult);
  TestValidator.equals(
    "super_admin grade filter should return 2 requests",
    superAdminGradeResult.data.length,
    2,
  );
  for (const request of superAdminGradeResult.data) {
    TestValidator.equals(
      "each request should be for super_admin grade",
      request.requestedGrade,
      "super_admin",
    );
  }
  // 11. Combined filter: actorType='customer' AND requestedGrade='super_admin'
  const combinedCustomerSuperAdmin =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          actorType: "customer",
          requestedGrade: "super_admin",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(combinedCustomerSuperAdmin);
  TestValidator.equals(
    "combined filter customer+super_admin should return 1 request",
    combinedCustomerSuperAdmin.data.length,
    1,
  );
  const combinedRequest1 = combinedCustomerSuperAdmin.data[0];
  TestValidator.equals(
    "request should be customer actor",
    combinedRequest1.actorType,
    "customer",
  );
  TestValidator.equals(
    "request should be super_admin grade",
    combinedRequest1.requestedGrade,
    "super_admin",
  );
  // 12. Combined filter: actorType='seller' AND requestedGrade='admin'
  const combinedSellerAdmin =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          actorType: "seller",
          requestedGrade: "admin",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(combinedSellerAdmin);
  TestValidator.equals(
    "combined filter seller+admin should return 1 request",
    combinedSellerAdmin.data.length,
    1,
  );
  const combinedRequest2 = combinedSellerAdmin.data[0];
  TestValidator.equals(
    "request should be seller actor",
    combinedRequest2.actorType,
    "seller",
  );
  TestValidator.equals(
    "request should be admin grade",
    combinedRequest2.requestedGrade,
    "admin",
  );
  // 13. Combined filter: status='pending' AND actorType='customer' AND requestedGrade='admin'
  const tripleFilter =
    await api.functional.ecommerceMall.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          actorType: "customer",
          requestedGrade: "admin",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(tripleFilter);
  TestValidator.equals(
    "triple filter should return 1 request",
    tripleFilter.data.length,
    1,
  );
  const tripleRequest = tripleFilter.data[0];
  TestValidator.equals(
    "request status should be pending",
    tripleRequest.status,
    "pending",
  );
  TestValidator.equals(
    "request actorType should be customer",
    tripleRequest.actorType,
    "customer",
  );
  TestValidator.equals(
    "request requestedGrade should be admin",
    tripleRequest.requestedGrade,
    "admin",
  );
  // 14. Validate pagination metadata reflects filtered count
  // Note: pagination.pagination contains the actual pagination info (records, pages, etc.)
  TestValidator.predicate(
    "pagination records should match data length",
    pendingResult.pagination.pagination.records >= pendingResult.data.length,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1",
    pendingResult.pagination.pagination.pages >= 1,
  );
}
