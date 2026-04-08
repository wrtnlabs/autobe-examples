import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminRequest";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator request filtering by status and requester type.
 *
 * Validates the filtering capabilities of the administrator access request endpoint, ensuring that administrators can accurately query requests by approval status and applicant type. The test verifies that filter parameters are correctly applied and the response structure includes proper pagination and applicant information based on the requester_type discriminator.
 *
 * Since the available API does not support creating admin requests from customers/sellers or approving/rejecting requests, this test focuses on validating the filter parameter handling and response structure of the index endpoint.
 *
 * 1. Authenticate as administrator to access admin-only endpoint.
 * 2. Test filtering by requester_type = "customer" and validate response structure.
 * 3. Test filtering by requester_type = "seller" and validate response structure.
 * 4. Test filtering by status = "pending" and validate response structure.
 * 5. Test combined filter (status + requester_type) and validate intersection logic.
 * 6. Validate pagination metadata is present and correctly structured.
 * 7. Validate applicant information matches requester_type discriminator when data exists.
 */
export async function test_api_admin_requests_filter_by_status_and_requester_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test filtering by requester_type = "customer"
  const customerRequests = await api.functional.ecommerce.admin.requests.index(
    adminConnection,
    {
      body: {
        requester_type: "customer",
        limit: 100,
      } satisfies IEcommerceAdminRequest.IRequest,
    },
  );
  typia.assert(customerRequests);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current",
    customerRequests.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    customerRequests.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    customerRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    customerRequests.pagination.pages >= 0,
  );
  // Validate all results are customer type when data exists
  if (customerRequests.data.length > 0) {
    TestValidator.predicate(
      "all are customer type",
      customerRequests.data.every((r) => r.requester_type === "customer"),
    );
    // Validate applicant is customer summary (has display_name)
    for (const req of customerRequests.data) {
      TestValidator.predicate(
        "applicant is customer",
        "display_name" in req.applicant,
      );
    }
  }
  // 3. Test filtering by requester_type = "seller"
  const sellerRequests = await api.functional.ecommerce.admin.requests.index(
    adminConnection,
    {
      body: {
        requester_type: "seller",
        limit: 100,
      } satisfies IEcommerceAdminRequest.IRequest,
    },
  );
  typia.assert(sellerRequests);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current",
    sellerRequests.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    sellerRequests.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    sellerRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    sellerRequests.pagination.pages >= 0,
  );
  // Validate all results are seller type when data exists
  if (sellerRequests.data.length > 0) {
    TestValidator.predicate(
      "all are seller type",
      sellerRequests.data.every((r) => r.requester_type === "seller"),
    );
    // Validate applicant is seller summary (has shop_name)
    for (const req of sellerRequests.data) {
      TestValidator.predicate(
        "applicant is seller",
        "shop_name" in req.applicant,
      );
    }
  }
  // 4. Test filtering by status = "pending"
  const pendingFilterResult =
    await api.functional.ecommerce.admin.requests.index(adminConnection, {
      body: {
        status: "pending",
        limit: 100,
      } satisfies IEcommerceAdminRequest.IRequest,
    });
  typia.assert(pendingFilterResult);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current",
    pendingFilterResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    pendingFilterResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    pendingFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    pendingFilterResult.pagination.pages >= 0,
  );
  // Validate all results are pending status when data exists
  if (pendingFilterResult.data.length > 0) {
    TestValidator.predicate(
      "all are pending",
      pendingFilterResult.data.every((r) => r.status === "pending"),
    );
    // Validate review information is null for pending requests
    for (const req of pendingFilterResult.data) {
      TestValidator.equals(
        "reviewed_at is null for pending",
        req.reviewed_at,
        null,
      );
      TestValidator.equals("reviewer is null for pending", req.reviewer, null);
    }
  }
  // 5. Test combined filter: status = pending AND requester_type = customer
  const combinedCustomerPending =
    await api.functional.ecommerce.admin.requests.index(adminConnection, {
      body: {
        status: "pending",
        requester_type: "customer",
        limit: 100,
      } satisfies IEcommerceAdminRequest.IRequest,
    });
  typia.assert(combinedCustomerPending);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current",
    combinedCustomerPending.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    combinedCustomerPending.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    combinedCustomerPending.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    combinedCustomerPending.pagination.pages >= 0,
  );
  // Validate intersection logic when data exists
  if (combinedCustomerPending.data.length > 0) {
    TestValidator.predicate(
      "all are customer and pending",
      combinedCustomerPending.data.every(
        (r) => r.requester_type === "customer" && r.status === "pending",
      ),
    );
  }
  // 6. Test combined filter: status = pending AND requester_type = seller
  const combinedSellerPending =
    await api.functional.ecommerce.admin.requests.index(adminConnection, {
      body: {
        status: "pending",
        requester_type: "seller",
        limit: 100,
      } satisfies IEcommerceAdminRequest.IRequest,
    });
  typia.assert(combinedSellerPending);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current",
    combinedSellerPending.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    combinedSellerPending.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    combinedSellerPending.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    combinedSellerPending.pagination.pages >= 0,
  );
  // Validate intersection logic when data exists
  if (combinedSellerPending.data.length > 0) {
    TestValidator.predicate(
      "all are seller and pending",
      combinedSellerPending.data.every(
        (r) => r.requester_type === "seller" && r.status === "pending",
      ),
    );
  }
  // 7. Test filtering by status = "approved"
  const approvedRequests = await api.functional.ecommerce.admin.requests.index(
    adminConnection,
    {
      body: {
        status: "approved",
        limit: 100,
      } satisfies IEcommerceAdminRequest.IRequest,
    },
  );
  typia.assert(approvedRequests);
  // Validate all approved requests have review information when data exists
  if (approvedRequests.data.length > 0) {
    TestValidator.predicate(
      "all are approved",
      approvedRequests.data.every((r) => r.status === "approved"),
    );
    for (const req of approvedRequests.data) {
      // Approved requests should have reviewer information
      TestValidator.predicate(
        "reviewer exists for approved",
        req.reviewer !== null && req.reviewer !== undefined,
      );
    }
  }
  // 8. Test filtering by status = "rejected"
  const rejectedRequests = await api.functional.ecommerce.admin.requests.index(
    adminConnection,
    {
      body: {
        status: "rejected",
        limit: 100,
      } satisfies IEcommerceAdminRequest.IRequest,
    },
  );
  typia.assert(rejectedRequests);
  // Validate all rejected requests have review information when data exists
  if (rejectedRequests.data.length > 0) {
    TestValidator.predicate(
      "all are rejected",
      rejectedRequests.data.every((r) => r.status === "rejected"),
    );
    for (const req of rejectedRequests.data) {
      // Rejected requests should have reviewer information
      TestValidator.predicate(
        "reviewer exists for rejected",
        req.reviewer !== null && req.reviewer !== undefined,
      );
    }
  }
}
