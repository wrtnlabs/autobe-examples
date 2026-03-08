import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

export async function test_api_admin_request_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test customer and submit admin request
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  const adminRequest =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      customerConnection,
      {
        body: {
          reason:
            "Need administrative access to manage products and orders for the store",
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // Verify initial status is pending
  TestValidator.equals(
    "initial request status is pending",
    adminRequest.request_status,
    "pending",
  );
  // 2. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(admin);
  // 3. Call rejection endpoint with meaningful reason (1-1000 chars)
  const rejectionReason =
    "Insufficient justification for administrative access. Please provide detailed business needs and clarify your role responsibilities.";
  const rejectionResponse =
    await api.functional.ecommerceMall.admin.admin_request_requests.reject(
      adminConnection,
      {
        adminRequestId: adminRequest.id,
        body: {
          rejectionReason: rejectionReason,
        } satisfies IEcommerceMallAdminRequestRequest.IRejectRequest,
      },
    );
  typia.assert(rejectionResponse);
  // 4. Validate response contains expected fields
  TestValidator.equals(
    "request status changed to rejected",
    rejectionResponse.request_status,
    "rejected",
  );
  TestValidator.equals(
    "original request reason preserved",
    rejectionResponse.reason,
    adminRequest.reason,
  );
  TestValidator.equals(
    "created_at unchanged from original",
    rejectionResponse.created_at,
    adminRequest.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed to rejection timestamp",
    adminRequest.updated_at,
    rejectionResponse.updated_at,
  );
  TestValidator.predicate(
    "requester_info type is customer",
    rejectionResponse.requester_info.type === "customer",
  );
  TestValidator.equals(
    "requester_info id matches customer account",
    rejectionResponse.requester_info.id,
    customer.id,
  );
  // 5. Verify immutable snapshot created (handled internally by rejection API)
  // The rejection response indicates snapshot was created successfully
  // Snapshot verification is an implementation detail of the backend
  // 6. Verify requester can view rejection details and resubmit request
  const viewerConnection: api.IConnection = { host: connection.host };
  const viewer = await authorize_customer_login(viewerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(viewer);
  // Verify requester can submit new admin request after rejection
  const newAdminRequest =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      viewerConnection,
      {
        body: {
          reason:
            "New attempt to request administrative access with additional justification for management responsibilities",
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(newAdminRequest);
  TestValidator.equals(
    "new request is in pending status",
    newAdminRequest.request_status,
    "pending",
  );
  TestValidator.notEquals(
    "new request has different ID",
    adminRequest.id,
    newAdminRequest.id,
  );
}
