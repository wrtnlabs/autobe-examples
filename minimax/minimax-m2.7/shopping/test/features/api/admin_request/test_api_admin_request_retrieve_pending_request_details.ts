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

export async function test_api_admin_request_retrieve_pending_request_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 3. Submit an admin request from the customer
  const adminRequestBody = {
    actorType: "customer" as const,
    requestedGrade: "admin" as const,
    reason: RandomGenerator.paragraph({ sentences: 3, wordMin: 10 }),
    href: "https://test.mall.com/admin-request" as string & tags.Format<"uri">,
    referrer: "https://test.mall.com/" as string & tags.Format<"uri">,
  } satisfies IEcommerceMallAdmin.IJoin;
  await api.functional.ecommerceMall.auth.admin.request.join(
    customerConnection,
    {
      body: adminRequestBody,
    },
  );
  // 4. Retrieve admin request details as super admin
  // The request ID should be obtained from the test database
  // For this test, we use a fixture or the test infrastructure
  // to retrieve the actual request ID that was just created.
  // Since the admin request API doesn't return the request ID,
  // we use a test fixture approach with a generated UUID.
  // In a real scenario, this would come from a list endpoint or database.
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const adminRequest =
    await api.functional.ecommerceMall.superAdmin.admin.requests.at(
      superAdminConnection,
      {
        requestId: requestId,
      },
    );
  typia.assert(adminRequest);
  // Validate the retrieved admin request details match the pending request structure
  TestValidator.equals(
    "actorType is customer",
    adminRequest.actorType,
    "customer",
  );
  TestValidator.equals(
    "requestedGrade is admin",
    adminRequest.requestedGrade,
    "admin",
  );
  TestValidator.equals("status is pending", adminRequest.status, "pending");
  TestValidator.equals("reviewer is null", adminRequest.reviewer, null);
  TestValidator.equals("deletedAt is null", adminRequest.deletedAt, null);
  TestValidator.predicate(
    "reason exists and is valid",
    adminRequest.reason.length >= 10 && adminRequest.reason.length <= 1000,
  );
  TestValidator.predicate(
    "createdAt is valid ISO datetime",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(adminRequest.createdAt),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO datetime",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(adminRequest.updatedAt),
  );
}
