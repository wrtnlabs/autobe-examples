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

export async function test_api_seller_admin_registration_request_view_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller and establish authenticated connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Register super administrator and establish authenticated connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  // 3. Seller submits an admin registration request
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const registrationRequest =
    await generate_random_e_commerce_mall_seller_admin_registration_requests_create(
      sellerConnection,
      {
        body: {
          reason,
        },
      },
    );
  typia.assert(registrationRequest);
  // 4. Super administrator reads the pending request
  const pendingRequest =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.at(
      superAdminConnection,
      {
        requestId: registrationRequest.id,
      },
    );
  typia.assert(pendingRequest);
  // 5. Super administrator approves the request
  const approvedRequest =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.update(
      superAdminConnection,
      {
        requestId: registrationRequest.id,
        body: {
          status: "approved" as const,
        } satisfies IECommerceMallAdminRegistrationRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 6. Target: Seller views the approved registration request
  const viewedRequest =
    await api.functional.eCommerceMall.seller.admin_registration_requests.at(
      sellerConnection,
      {
        requestId: registrationRequest.id,
      },
    );
  typia.assert(viewedRequest);
  // 7. Validate response fields
  TestValidator.equals("status is approved", viewedRequest.status, "approved");
  TestValidator.equals(
    "rejection_reason is null",
    viewedRequest.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "reviewer is present after approval",
    () => viewedRequest.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewed_at is not null",
    () => viewedRequest.reviewed_at !== null,
  );
  TestValidator.equals(
    "requester_type is seller",
    viewedRequest.requester_type,
    "seller",
  );
  TestValidator.equals(
    "reason matches submission",
    viewedRequest.reason,
    reason,
  );
  TestValidator.equals("deleted_at is null", viewedRequest.deleted_at, null);
}
