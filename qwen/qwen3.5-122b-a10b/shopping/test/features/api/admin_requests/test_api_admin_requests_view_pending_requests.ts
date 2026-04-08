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

export async function test_api_admin_requests_view_pending_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: "Platform administration request for testing",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Administrator views pending requests
  const result = await api.functional.ecommerce.admin.requests.index(
    adminConnection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 10,
      } satisfies IEcommerceAdminRequest.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.predicate(
    "pagination pages calculated correctly",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // 4. Validate response structure when requests exist
  if (result.data.length > 0) {
    // Find any customer request in the results
    const customerRequest = result.data.find(
      (req) => req.requester_type === "customer",
    );
    if (customerRequest) {
      TestValidator.equals(
        "request status is pending",
        customerRequest.status,
        "pending",
      );
      TestValidator.predicate(
        "request has reason",
        customerRequest.reason.length > 0,
      );
      TestValidator.predicate(
        "request has creation timestamp",
        typeof customerRequest.created_at === "string",
      );
      TestValidator.equals(
        "applicant is customer",
        customerRequest.requester_type,
        "customer",
      );
      // Validate customer applicant details
      const customerApplicant =
        customerRequest.applicant as IEcommerceCustomer.ISummary;
      TestValidator.predicate(
        "applicant has email",
        typeof customerApplicant.email === "string",
      );
      TestValidator.predicate(
        "applicant has display name",
        customerApplicant.display_name.length > 0,
      );
      // Validate that reviewer is null for pending requests
      TestValidator.predicate(
        "pending request has no reviewer",
        customerRequest.reviewer === undefined ||
          customerRequest.reviewer === null,
      );
    }
    // Find any seller request in the results
    const sellerRequest = result.data.find(
      (req) => req.requester_type === "seller",
    );
    if (sellerRequest) {
      TestValidator.equals(
        "seller request status is pending",
        sellerRequest.status,
        "pending",
      );
      TestValidator.equals(
        "seller applicant is seller",
        sellerRequest.requester_type,
        "seller",
      );
      const sellerApplicant =
        sellerRequest.applicant as IEcommerceSeller.ISummary;
      TestValidator.predicate(
        "seller applicant has shop name",
        sellerApplicant.shop_name.length > 0,
      );
    }
  }
  // 5. Test filtering by requester_type
  const customerOnlyResult =
    await api.functional.ecommerce.admin.requests.index(adminConnection, {
      body: {
        status: "pending",
        requester_type: "customer",
        page: 1,
        limit: 10,
      } satisfies IEcommerceAdminRequest.IRequest,
    });
  typia.assert(customerOnlyResult);
  TestValidator.predicate(
    "customer filter returns only customer requests",
    customerOnlyResult.data.every((req) => req.requester_type === "customer"),
  );
  // 6. Test search functionality
  const searchResult = await api.functional.ecommerce.admin.requests.index(
    adminConnection,
    {
      body: {
        status: "pending",
        search: "platform",
        page: 1,
        limit: 10,
      } satisfies IEcommerceAdminRequest.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns matching requests",
    searchResult.data.every((req) =>
      req.reason.toLowerCase().includes("platform"),
    ),
  );
  // 7. Test filtering by approved status
  const approvedResult = await api.functional.ecommerce.admin.requests.index(
    adminConnection,
    {
      body: {
        status: "approved",
        page: 1,
        limit: 10,
      } satisfies IEcommerceAdminRequest.IRequest,
    },
  );
  typia.assert(approvedResult);
  TestValidator.predicate(
    "approved filter returns only approved requests",
    approvedResult.data.every((req) => req.status === "approved"),
  );
  // 8. Test filtering by rejected status
  const rejectedResult = await api.functional.ecommerce.admin.requests.index(
    adminConnection,
    {
      body: {
        status: "rejected",
        page: 1,
        limit: 10,
      } satisfies IEcommerceAdminRequest.IRequest,
    },
  );
  typia.assert(rejectedResult);
  TestValidator.predicate(
    "rejected filter returns only rejected requests",
    rejectedResult.data.every((req) => req.status === "rejected"),
  );
}
