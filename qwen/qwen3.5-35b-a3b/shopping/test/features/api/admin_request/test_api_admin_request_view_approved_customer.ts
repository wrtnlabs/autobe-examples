import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallAdminRequestRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfCustomer";
import type { IEcommerceMallAdminRequestRequestOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfSeller";
import type { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request_request";

export async function test_api_admin_request_view_approved_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Administrator Setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // 2. Customer Setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuthorized);
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = customerAuthorized.token.access;
  // 3. Customer submits admin access request
  const customerAdminRequest =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(customerAdminRequest);
  typia.assert<IEcommerceMallAdminRequestRequest>(customerAdminRequest);
  const adminRequestId = customerAdminRequest.id;
  const customerEmail = customerAuthorized.email;
  // 4. Admin reviews and approves the request
  const approvedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.review(
      adminConnection,
      {
        requestId: adminRequestId,
        body: {
          action: "approve",
        } satisfies IEcommerceMallAdminRequestRequest.IReview,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "request status approved",
    approvedRequest.request_status,
    "approved",
  );
  // 5. Admin retrieves the approved customer request details
  const retrievedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.customer_request.at(
      adminConnection,
      {
        adminRequestId: adminRequestId,
      },
    );
  typia.assert(retrievedRequest);
  typia.assert<IEcommerceMallAdminRequestRequest.ICustomerDetail>(
    retrievedRequest,
  );
  // 6. Validate response structure
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    adminRequestId,
  );
  TestValidator.equals(
    "request status approved",
    retrievedRequest.requestStatus,
    "approved",
  );
  TestValidator.equals(
    "reason preserved",
    retrievedRequest.reason,
    customerAdminRequest.reason,
  );
  TestValidator.predicate(
    "has valid created_at",
    typeof retrievedRequest.createdAt === "string",
  );
  TestValidator.predicate(
    "has valid updated_at",
    typeof retrievedRequest.updatedAt === "string",
  );
  TestValidator.equals(
    "deleted_at should be null",
    retrievedRequest.deletedAt,
    null,
  );
  // 7. Validate customer information
  TestValidator.equals(
    "customer email matches",
    retrievedRequest.customer.email,
    customerEmail,
  );
  TestValidator.predicate(
    "customer display_name exists",
    retrievedRequest.customer.display_name.length > 0,
  );
  TestValidator.predicate(
    "customer ID exists",
    retrievedRequest.customer.id.length > 0,
  );
}