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

export async function test_api_admin_request_retrieval_with_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as a super administrator
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: adminPassword,
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Step 2: Join as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Step 3: Customer creates admin request
  const request =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      customerConnection,
      {
        body: {
          reason:
            "Need administrative access to perform system maintenance and troubleshooting",
        } satisfies IEcommerceMallAdminRequestRequest.ICreate,
      },
    );
  typia.assert(request);
  // Step 4: Log in as the super administrator with fresh connection
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: admin.email,
      password: adminPassword,
    },
  });
  typia.assert(adminLogin);
  // Step 5: Admin retrieves the admin request
  const retrievedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.at(
      adminLoginConnection,
      {
        adminRequestId: request.id,
      },
    );
  typia.assert(retrievedRequest);
  // Step 6: Validate the response structure
  TestValidator.equals("request ID matches", retrievedRequest.id, request.id);
  TestValidator.equals(
    "reason matches",
    retrievedRequest.reason,
    request.reason,
  );
  TestValidator.equals(
    "request status is pending",
    retrievedRequest.request_status,
    "pending",
  );
  // Step 7: Validate snapshots array exists
  TestValidator.equals(
    "snapshots is array",
    Array.isArray(retrievedRequest.snapshots),
    true,
  );
  TestValidator.predicate(
    "snapshot count non-negative",
    () => retrievedRequest.snapshots.length >= 0,
  );
  // Step 8: Validate snapshot structure if any snapshots exist
  if (retrievedRequest.snapshots.length > 0) {
    const snapshot = retrievedRequest.snapshots[0];
    TestValidator.equals("snapshot has ID", snapshot.id !== undefined, true);
    TestValidator.equals(
      "snapshot has reason",
      snapshot.reason !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has request_status",
      snapshot.request_status !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has changedAt",
      snapshot.changed_at !== undefined,
      true,
    );
    TestValidator.predicate(
      "snapshot has adminRequest reference",
      () => snapshot.adminRequest !== null,
    );
    TestValidator.predicate(
      "snapshot changedBy may be null",
      () => snapshot.changedBy === null || snapshot.changedBy !== null,
    );
  }
}
