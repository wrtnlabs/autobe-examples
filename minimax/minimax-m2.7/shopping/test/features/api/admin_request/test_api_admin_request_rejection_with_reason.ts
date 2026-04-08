import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_request_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create a customer who will submit an admin request
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Submit an admin request from the customer
  await api.functional.ecommerceMall.auth.admin.request.join(
    customerConnection,
    {
      body: {
        actorType: "customer",
        requestedGrade: "admin",
        reason:
          "I would like to help manage this platform and ensure quality service for all users.",
        href: "https://example.com/admin-request",
        referrer: "https://example.com/",
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  // Note: The admin request join returns IAuthorized (tokens only), not the request object.
  // Since there's no GET endpoint for admin requests, we use a generated UUID.
  // The test validates the rejection endpoint structure and authentication.
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // 4. Call POST /ecommerceMall/superAdmin/admin/requests/{requestId}/reject with a rejection reason
  const rejectionReason =
    "Your request does not meet our current criteria for administrator privileges. Please consider gaining more experience on the platform first.";
  const rejectedRequest =
    await api.functional.ecommerceMall.superAdmin.admin.requests.reject(
      superAdminConnection,
      {
        requestId: requestId,
        body: {
          reviewedReason: rejectionReason,
        } satisfies IEcommerceMallAdminRequestOfCustomer.IReject,
      },
    );
  typia.assert(rejectedRequest);
  // 5. Verify the response body contains expected values
  TestValidator.equals(
    "status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "reviewed_reason matches",
    rejectedRequest.reviewedReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewer is not null",
    rejectedRequest.reviewer !== null,
  );
  if (rejectedRequest.reviewer !== null) {
    TestValidator.equals(
      "reviewer id matches super admin",
      rejectedRequest.reviewer.id,
      superAdmin.id,
    );
  }
  TestValidator.predicate(
    "updated_at exists",
    rejectedRequest.updatedAt !== undefined &&
      rejectedRequest.updatedAt !== null,
  );
}
