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

export async function test_api_seller_admin_registration_request_view_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerJoinResult);
  // 2. Register a super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinResult = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminJoinResult);
  // 3. Seller submits an admin registration request with a known reason
  const reason = RandomGenerator.paragraph({ sentences: 1 });
  const request =
    await generate_random_e_commerce_mall_seller_admin_registration_requests_create(
      sellerConnection,
      {
        body: {
          reason,
        } satisfies IECommerceMallAdminRegistrationRequest.ICreate,
      },
    );
  typia.assert(request);
  // 4. Super administrator reads the pending request
  const pendingRequest =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.at(
      superAdminConnection,
      {
        requestId: request.id,
      },
    );
  typia.assert(pendingRequest);
  TestValidator.equals("status is pending", pendingRequest.status, "pending");
  // 5. Super administrator rejects the request with a known rejection reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 1 });
  const rejected =
    await api.functional.eCommerceMall.superAdministrator.admin_registration_requests.update(
      superAdminConnection,
      {
        requestId: request.id,
        body: {
          status: "rejected" as const,
          rejectionReason,
        } satisfies IECommerceMallAdminRegistrationRequest.IUpdate,
      },
    );
  typia.assert(rejected);
  // 6. Seller views the rejected request
  const sellerView =
    await api.functional.eCommerceMall.seller.admin_registration_requests.at(
      sellerConnection,
      {
        requestId: request.id,
      },
    );
  typia.assert(sellerView);
  // 7. Business-logic validation
  TestValidator.equals("status is rejected", sellerView.status, "rejected");
  TestValidator.equals(
    "rejection reason matches",
    sellerView.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate("reviewer is not null", sellerView.reviewer !== null);
  TestValidator.predicate(
    "reviewer has id",
    (sellerView.reviewer as IECommerceMallSuperAdministrator.ISummary).id !==
      undefined,
  );
  TestValidator.predicate(
    "reviewer has email",
    (sellerView.reviewer as IECommerceMallSuperAdministrator.ISummary).email !==
      undefined,
  );
  TestValidator.predicate(
    "reviewer has administrator info",
    (sellerView.reviewer as IECommerceMallSuperAdministrator.ISummary)
      .administrator !== undefined,
  );
  TestValidator.predicate(
    "reviewed_at is not null",
    sellerView.reviewed_at !== null,
  );
  TestValidator.equals(
    "requester_type is seller",
    sellerView.requester_type,
    "seller",
  );
  TestValidator.equals("reason matches", sellerView.reason, reason);
  TestValidator.equals("deleted_at is null", sellerView.deleted_at, null);
}
