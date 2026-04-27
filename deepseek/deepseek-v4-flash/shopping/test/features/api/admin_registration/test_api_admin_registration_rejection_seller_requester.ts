import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_e_commerce_mall_seller_admin_registration_requests_create } from "../../../generate/generate_random_e_commerce_mall_seller_admin_registration_requests_create";
import { prepare_random_ecommerce_mall_admin_registration_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_registration_request";

export async function test_api_admin_registration_rejection_seller_requester(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Seller submits an admin registration request
  const request =
    await generate_random_e_commerce_mall_seller_admin_registration_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(request);
  TestValidator.equals("status is pending", request.status, "pending");
  TestValidator.equals(
    "requester type is seller",
    request.requester_type,
    "seller",
  );
  // 3. Authenticate as a super administrator via login with pre-seeded credentials
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminConnection, {
    body: {
      email: "root@ecommerce-mall.dev",
      password: "super_admin_password",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSuperAdministrator.ILogin,
  });
  // 4. Reject the pending registration request
  const rejectionReason =
    "Seller accounts should focus on marketplace selling activities; admin privileges require a separate application process.";
  const updated =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.update(
      superAdminConnection,
      {
        requestId: request.id,
        body: {
          status: "rejected",
          rejectionReason,
        } satisfies IECommerceMallAdminRegistrationRequest.IUpdate,
      },
    );
  typia.assert(updated);
  // 5. Validate the rejected request
  TestValidator.equals("status is rejected", updated.status, "rejected");
  TestValidator.equals(
    "rejection reason matches",
    updated.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate("reviewer is set", updated.reviewer !== null);
  TestValidator.predicate("reviewed_at is set", updated.reviewed_at !== null);
  TestValidator.equals("request id preserved", updated.id, request.id);
  TestValidator.equals(
    "requester type preserved",
    updated.requester_type,
    request.requester_type,
  );
  TestValidator.equals("reason preserved", updated.reason, request.reason);
  TestValidator.equals(
    "created_at preserved",
    updated.created_at,
    request.created_at,
  );
}
