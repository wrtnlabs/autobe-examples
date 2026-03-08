import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestRequest";
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
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { generate_random_ecommerce_mall_seller_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request_request";

export async function test_api_admin_request_requester_type_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Setup: Create customer accounts and submit admin requests
  const customerConnections: api.IConnection[] = [];
  const customerRequests: IEcommerceMallAdminRequestRequest[] = [];
  for (let i = 0; i < 3; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
    customerConnections.push(customerConnection);
    // Submit admin request from customer
    const customerRequest =
      await generate_random_ecommerce_mall_customer_admin_requests_create(
        customerConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(customerRequest);
    customerRequests.push(customerRequest);
  }
  // 3. Setup: Create seller accounts and submit admin requests
  const sellerConnections: api.IConnection[] = [];
  const sellerRequests: IEcommerceMallAdminRequestRequest[] = [];
  for (let i = 0; i < 3; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
    sellerConnections.push(sellerConnection);
    // Submit admin request from seller
    const sellerRequest =
      await generate_random_ecommerce_mall_seller_admin_requests_create(
        sellerConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(sellerRequest);
    sellerRequests.push(sellerRequest);
  }
  // 4. Test: Filter by customer requester_type
  const customerFilter =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          requester_type: "customer",
          limit: 100,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(customerFilter);
  // Validate customer filter returns correct count
  TestValidator.equals(
    "customer filter total count",
    customerFilter.pagination.records,
    customerRequests.length,
  );
  // Validate all returned request IDs are from customer requests
  for (const request of customerFilter.data) {
    const matchingCustomer = customerRequests.find((r) => r.id === request.id);
    TestValidator.equals(
      "request ID exists in customer requests",
      request.id,
      matchingCustomer?.id,
    );
  }
  // 5. Test: Filter by seller requester_type
  const sellerFilter =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          requester_type: "seller",
          limit: 100,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(sellerFilter);
  // Validate seller filter returns correct count
  TestValidator.equals(
    "seller filter total count",
    sellerFilter.pagination.records,
    sellerRequests.length,
  );
  // Validate all returned request IDs are from seller requests
  for (const request of sellerFilter.data) {
    const matchingSeller = sellerRequests.find((r) => r.id === request.id);
    TestValidator.equals(
      "request ID exists in seller requests",
      request.id,
      matchingSeller?.id,
    );
  }
  // 6. Test: Combined filtering (customer + pending status)
  const combinedFilter =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          requester_type: "customer",
          request_status: "pending",
          limit: 100,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Validate combined filter returns expected count
  const expectedPendingCount = customerRequests.filter(
    (r) => r.request_status === "pending",
  ).length;
  TestValidator.equals(
    "combined filter total count",
    combinedFilter.pagination.records,
    expectedPendingCount,
  );
  // Validate all returned requests are from customers with pending status
  for (const request of combinedFilter.data) {
    TestValidator.equals(
      "combined filter request status",
      request.request_status,
      "pending",
    );
    const matchingCustomer = customerRequests.find((r) => r.id === request.id);
    TestValidator.equals(
      "combined filter request ID valid",
      request.id,
      matchingCustomer?.id,
    );
  }
  // 7. Validation: Total count verification
  const unfiltered =
    await api.functional.ecommerceMall.admin.admin_requests.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallAdminRequestRequest.IRequest,
      },
    );
  typia.assert(unfiltered);
  TestValidator.equals(
    "unfiltered total equals sum of filtered",
    unfiltered.pagination.records,
    customerFilter.pagination.records + sellerFilter.pagination.records,
  );
}
