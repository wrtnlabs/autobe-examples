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

export async function test_api_admin_request_regular_admin_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: "adminPassword123",
      href: "http://localhost:3000/admin/join",
      referrer: "http://localhost:3000/admin",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // 2. Create customer account and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: "customerPassword123",
      href: "http://localhost:3000/customer/join",
      referrer: "http://localhost:3000/customer",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: {
      email: customer.email,
      password: "customerPassword123",
      href: "http://localhost:3000/customer/login",
      referrer: "http://localhost:3000/customer",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(customerLogin);
  // 3. Customer creates admin request
  const adminRequest =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      customerConnection,
      {
        body: {
          reason:
            "I need admin privileges to manage the platform for testing purposes",
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  const requestId = adminRequest.id;
  // 4. Verify request was created with pending status
  TestValidator.equals(
    "admin request created with pending status",
    adminRequest.request_status,
    "pending",
  );
  // 5. Regular admin attempts to approve the request (should fail with 403 Forbidden)
  await TestValidator.httpError(
    "regular admin cannot approve admin request due to insufficient privileges",
    403,
    async () => {
      await api.functional.ecommerceMall.admin.admin_requests.updateStatus(
        adminConnection,
        {
          adminRequestId: requestId,
          body: {
            status: "approved",
          } satisfies IEcommerceMallAdminRequestRequest.IUpdateStatus,
        },
      );
    },
  );
  // 6. Regular admin attempts to reject the request (should also fail with 403 Forbidden)
  await TestValidator.httpError(
    "regular admin cannot reject admin request due to insufficient privileges",
    403,
    async () => {
      await api.functional.ecommerceMall.admin.admin_requests.updateStatus(
        adminConnection,
        {
          adminRequestId: requestId,
          body: {
            status: "rejected",
            rejection_reason: "Insufficient reasons for admin access",
          } satisfies IEcommerceMallAdminRequestRequest.IUpdateStatus,
        },
      );
    },
  );
  // 7. Verify no snapshots were created (admin request should remain unchanged)
  TestValidator.equals(
    "no snapshots created on forbidden request attempts",
    adminRequest.snapshots.length,
    0,
  );
}
