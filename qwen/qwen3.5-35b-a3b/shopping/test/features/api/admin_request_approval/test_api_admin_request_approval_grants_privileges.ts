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

export async function test_api_admin_request_approval_grants_privileges(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminResponse = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(superAdminResponse);
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerResponse);
  // 3. Customer submits admin request
  const adminRequest =
    await generate_random_ecommerce_mall_customer_admin_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(adminRequest);
  // 4. Validate initial request status is pending
  TestValidator.equals(
    "initial request status is pending",
    adminRequest.request_status,
    "pending",
  );
  // 5. Super administrator approves the request
  const approvalConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(approvalConnection, {
    body: {
      email: superAdminResponse.email,
      password: superAdminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const updatedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.updateStatus(
      approvalConnection,
      {
        adminRequestId: adminRequest.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallAdminRequestRequest.IUpdateStatus,
      },
    );
  typia.assert(updatedRequest);
  // 6. Validate status changed to approved
  TestValidator.equals(
    "request status changed to approved",
    updatedRequest.request_status,
    "approved",
  );
  // 7. Validate snapshot was created with changed_at and changedBy
  TestValidator.predicate(
    "snapshot created after approval",
    updatedRequest.snapshots.length > 0,
  );
  const snapshot = updatedRequest.snapshots[0];
  TestValidator.predicate(
    "snapshot has changed_at timestamp",
    snapshot.changed_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot has changedBy reference",
    snapshot.changedBy !== null,
  );
  TestValidator.equals(
    "snapshot changedBy matches approving admin",
    snapshot.changedBy?.id,
    superAdminResponse.id,
  );
  // 8. Verify customer was upgraded to admin by logging in as admin
  const upgradedAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(upgradedAdminConnection, {
    body: {
      email: customerResponse.email,
      password: customerPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 9. Customer can no longer submit new admin requests
  void TestValidator.error(
    "customer cannot submit new admin request after becoming admin",
    async () => {
      await generate_random_ecommerce_mall_customer_admin_requests_create(
        upgradedAdminConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    },
  );
}