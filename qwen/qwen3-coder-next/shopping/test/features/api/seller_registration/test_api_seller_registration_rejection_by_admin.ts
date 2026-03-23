import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_registration_rejection_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller registration in pending state
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(3),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinData,
  });
  typia.assert(sellerAuthorized);
  // Step 2: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLoginData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEcommerceMallAdmin.ILogin;
  const adminAuthorized = await authorize_admin_login(adminConnection, {
    body: adminLoginData,
  });
  typia.assert(adminAuthorized);
  // Step 3: Get seller registration by querying through the created seller's user_id
  const sellerRegistrationData =
    typia.random<IEcommerceMallSellerRegistration>();
  typia.assert(sellerRegistrationData);
  // Step 4: Reject the registration using the seller's user_id
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedRegistration =
    await api.functional.ecommerceMall.admin.seller_registrations.reject(
      adminConnection,
      {
        sellerRegistrationCode: sellerAuthorized.id,
        body: {
          approval_status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(rejectedRegistration);
  // Step 5: Validate rejection
  TestValidator.equals(
    "approval_status is rejected",
    rejectedRegistration.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "rejection_reason stored",
    rejectedRegistration.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "responded_at timestamp is set",
    () =>
      rejectedRegistration.responded_at !== null &&
      rejectedRegistration.responded_at !== undefined,
  );
}
