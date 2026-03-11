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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request_request";

/**
 * Test seller admin request approval workflow.
 * 1. Create super administrator and authenticate
 * 2. Create seller account and authenticate
 * 3. Create customer account (required dependency)
 * 4. Seller submits admin access request
 * 5. Super admin approves the request
 * 6. Retrieve seller's admin request details
 * 7. Validate approval status and timestamps
 */
export async function test_api_admin_request_seller_approved_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>() satisfies string as string;
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminJoinResult);
  // 2. Login as super administrator
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // 3. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>() satisfies string as string;
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoinResult);
  // 4. Login as seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  // 5. Create customer account (required dependency)
  const customerEmail = typia.random<string & tags.Format<"email">>() satisfies string as string;
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerJoinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 6. Login as customer (required for system setup)
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 7. Seller submits admin access request
  const sellerAdminRequest =
    await api.functional.ecommerceMall.customer.admin_requests.create(
      sellerLoginConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(sellerAdminRequest);
  // 8. Super admin approves the request
  const updateResult =
    await api.functional.ecommerceMall.admin.admin_requests.updateStatus(
      adminLoginConnection,
      {
        adminRequestId: sellerAdminRequest.id,
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(updateResult);
  // 9. Retrieve seller's admin request details
  const sellerRequestDetails =
    await api.functional.ecommerceMall.admin.admin_requests.seller_request.at(
      adminLoginConnection,
      {
        adminRequestId: sellerAdminRequest.id,
      },
    );
  typia.assert(sellerRequestDetails);
  // 10. Validate approval status
  TestValidator.equals(
    "request status is approved",
    sellerRequestDetails.request_status,
    "approved",
  );
  // 11. Verify updated_at is present
  TestValidator.predicate(
    "request has updated_at",
    sellerRequestDetails.updated_at !== undefined,
  );
}