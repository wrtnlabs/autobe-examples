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

/**
 * Test that regular administrators cannot retrieve admin request snapshots.
 * Only super administrators should have access to these audit snapshots.
 */
export async function test_api_admin_request_snapshot_retrieval_by_unauthorized_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerResult = await authorize_customer_join(customerConnection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>() satisfies string as string),
      password: RandomGenerator.alphaNumeric(16),
      href: (typia.random<string & tags.Format<"uri">>() satisfies string as string),
      referrer: (typia.random<string & tags.Format<"uri">>() satisfies string as string),
      ip: (typia.random<string & tags.Format<"ipv4">>() satisfies string as string),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerResult);
  // Step 2: Customer submits admin access request
  const adminRequest =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 6,
          }),
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  const adminRequestId = adminRequest.id;
  // Step 3: Create regular administrator (non-super admin)
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(regularAdminConnection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>() satisfies string as string),
      password: RandomGenerator.alphaNumeric(16),
      href: (typia.random<string & tags.Format<"uri">>() satisfies string as string),
      referrer: (typia.random<string & tags.Format<"uri">>() satisfies string as string),
      ip: (typia.random<string & tags.Format<"ipv4">>() satisfies string as string),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(regularAdminConnection.headers?.["Authorization"]);
  // Step 4: Create super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>() satisfies string as string),
      password: RandomGenerator.alphaNumeric(16),
      href: (typia.random<string & tags.Format<"uri">>() satisfies string as string),
      referrer: (typia.random<string & tags.Format<"uri">>() satisfies string as string),
      ip: (typia.random<string & tags.Format<"ipv4">>() satisfies string as string),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(superAdminConnection.headers?.["Authorization"]);
  // Step 5: Super admin approves the customer's request (creates snapshot)
  const approvedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.updateStatus(
      superAdminConnection,
      {
        adminRequestId: adminRequestId,
        body: {
          status: "approved",
        } satisfies IEcommerceMallAdminRequestRequest.IUpdateStatus,
      },
    );
  typia.assert(approvedRequest);
  // Validate snapshot was created
  TestValidator.predicate(
    "request was approved",
    approvedRequest.request_status === "approved",
  );
  TestValidator.notEquals(
    "has at least one snapshot",
    approvedRequest.snapshots.length,
    0,
  );
  // Get the first snapshot ID
  const snapshotId = approvedRequest.snapshots[0].id;
  // Step 6: Switch to regular admin context
  // regularAdminConnection is already authorized from Step 3
  // Step 7: Regular admin attempts to retrieve snapshot (should fail with 403)
  await TestValidator.error(
    "regular admin cannot retrieve admin request snapshot",
    async () => {
      await api.functional.ecommerceMall.admin.admin_requests.snapshots.at(
        regularAdminConnection,
        {
          adminRequestId: adminRequestId,
          snapshotId: snapshotId,
        },
      );
    },
  );
}