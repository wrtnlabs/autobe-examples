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

/**
 * Test super administrator viewing of administrative access requests.
 *
 * Workflow:
 * 1. Create and authenticate as super administrator
 * 2. Create and authenticate as customer
 * 3. Customer submits admin access request
 * 4. Super administrator retrieves the request details
 * 5. Validate response contains complete request information
 */
export async function test_api_admin_request_view_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator (create admin account)
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuthorized.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Setup customer
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customerAuthorized);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerAuthorized.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 3. Customer creates admin access request
  const adminRequest =
    await generate_random_ecommerce_mall_customer_admin_requests_create(
      customerLoginConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
        },
      },
    );
  typia.assert(adminRequest);
  // 4. Super administrator retrieves the admin request
  const adminViewConnection: api.IConnection = { host: connection.host };
  const retrievedRequest =
    await api.functional.ecommerceMall.admin.admin_requests.at(
      adminViewConnection,
      {
        adminRequestId: adminRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate response contains complete request information
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "request reason matches",
    retrievedRequest.reason,
    adminRequest.reason,
  );
  TestValidator.equals(
    "request status matches",
    retrievedRequest.request_status,
    adminRequest.request_status,
  );
  TestValidator.equals(
    "creation timestamp matches",
    retrievedRequest.created_at,
    adminRequest.created_at,
  );
  TestValidator.equals(
    "update timestamp matches",
    retrievedRequest.updated_at,
    adminRequest.updated_at,
  );
  TestValidator.equals(
    "soft delete timestamp matches",
    retrievedRequest.deleted_at,
    adminRequest.deleted_at,
  );
  TestValidator.equals(
    "admin account summary matches",
    retrievedRequest.admin,
    adminRequest.admin,
  );
}