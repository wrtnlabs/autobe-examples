import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request";

export async function test_api_admin_request_details_retrieval_reviewed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and login as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  // 2. Create seller account with credentials
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await api.functional.ecommerceMall.auth.seller.join(
    sellerJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!" as any,
        href: "https://example.com/seller",
        referrer: "https://example.com",
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerJoinResult);
  // Login as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinResult.email,
      password: "TestPassword123!" as any,
      href: "https://example.com/seller",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Seller submits admin request
  const adminRequest =
    await generate_random_ecommerce_mall_seller_admin_requests_create(
      sellerConnection,
      {
        body: {
          reason:
            "I want to help manage the platform and ensure quality service.",
        },
      },
    );
  typia.assert(adminRequest);
  // 4. Super admin approves the admin request
  const updateResult =
    await api.functional.ecommerceMall.superAdmin.admin.requests.update(
      superAdminConnection,
      {
        requestId: adminRequest.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallAdminRequest.IUpdate,
      },
    );
  typia.assert(updateResult);
  // 5. Retrieve reviewed admin request details
  const requestDetails =
    await api.functional.ecommerceMall.superAdmin.admin.requests.at(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(requestDetails);
  // 6. Validate reviewed request details
  TestValidator.equals("status is approved", requestDetails.status, "approved");
  TestValidator.notEquals(
    "reviewer is not null",
    requestDetails.reviewer,
    null,
  );
  TestValidator.equals(
    "reviewer id matches super admin",
    requestDetails.reviewer!.id,
    superAdminAuth.id,
  );
  TestValidator.equals(
    "reviewed_reason matches",
    requestDetails.reviewed_reason,
    null,
  );
  TestValidator.equals(
    "request id preserved",
    requestDetails.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "actor_type is seller",
    requestDetails.actor_type,
    "seller",
  );
  TestValidator.equals(
    "requested_grade preserved",
    requestDetails.requested_grade,
    adminRequest.requested_grade,
  );
}
