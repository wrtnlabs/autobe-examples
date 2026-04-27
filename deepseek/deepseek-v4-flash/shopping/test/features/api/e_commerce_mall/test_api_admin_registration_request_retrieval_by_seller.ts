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

export async function test_api_admin_registration_request_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Submit an admin registration request as the seller with a known reason
  const reason = "I want to help manage seller disputes";
  const request =
    await generate_random_e_commerce_mall_seller_admin_registration_requests_create(
      sellerConnection,
      {
        body: {
          reason,
        } satisfies DeepPartial<IECommerceMallAdminRegistrationRequest.ICreate>,
      },
    );
  typia.assert(request);
  // 3. Create and authenticate a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // 4. Retrieve the admin registration request as super admin
  const retrieved =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.at(
      superAdminConnection,
      { requestId: request.id },
    );
  typia.assert(retrieved);
  // 5. Validate retrieved request fields
  TestValidator.equals("id matches", retrieved.id, request.id);
  TestValidator.equals(
    "requester_type is seller",
    retrieved.requester_type,
    "seller",
  );
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals("reason matches", retrieved.reason, reason);
  TestValidator.equals("reviewer is null", retrieved.reviewer, null);
  TestValidator.equals("reviewed_at is null", retrieved.reviewed_at, null);
  TestValidator.equals(
    "rejection_reason is null",
    retrieved.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "created_at is present",
    typeof retrieved.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof retrieved.updated_at === "string",
  );
  // 6. Validate polymorphic requester resolution for seller type
  if (retrieved.requester_type === "seller") {
    typia.assertGuard<IECommerceMallSeller.ISummary>(retrieved.requester);
    TestValidator.equals(
      "requester id matches seller",
      retrieved.requester.id,
      sellerAuth.id,
    );
    TestValidator.equals(
      "requester email matches seller",
      retrieved.requester.email,
      sellerAuth.email,
    );
    TestValidator.equals(
      "requester approval_status is pending",
      retrieved.requester.approval_status,
      "pending",
    );
  }
}
