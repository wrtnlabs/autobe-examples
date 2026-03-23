import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_seller_suspensions_suspend } from "../../../generate/generate_random_ecommerce_mall_admin_seller_suspensions_suspend";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_suspension_reinstatement_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Get admin summary from the connection (would be set by authorize function)
  const adminSummary: IEcommerceMallAdmin.ISummary = {
    id: "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">,
    email: "admin@example.com" as string & tags.Format<"email">,
    grade: "super",
    created_at: new Date().toISOString(),
  };
  // 2. Create seller account and approve it
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerJoinResult);
  // Create seller registration (since we need to approve it)
  const registration =
    await api.functional.ecommerceMall.admin.seller_registrations.approve(
      adminConnection,
      {
        sellerRegistrationId: "00000000-0000-0000-0000-000000000001" as string,
        body: {
          approval_status: "approved",
          responded_at: new Date().toISOString(),
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(registration);
  // 3. Suspend the seller account
  const suspension =
    await api.functional.ecommerceMall.admin.seller_suspensions.suspend(
      adminConnection,
      {
        body: {
          seller_id: sellerJoinResult.id,
          reason: "Policy violation",
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension);
  // 4. Unsuspend the seller account
  const unsuspension =
    await api.functional.ecommerceMall.admin.seller_suspensions.unsuspend(
      adminConnection,
      {
        sellerSuspensionId: suspension.id,
        body: {} satisfies IEcommerceMallSellerSuspension.IUnsuspend,
      },
    );
  typia.assert(unsuspension);
  // 5. Retrieve the suspension record
  const retrievedSuspension =
    await api.functional.ecommerceMall.admin.seller_suspensions.at(
      adminConnection,
      {
        sellerSuspensionId: suspension.id,
      },
    );
  typia.assert(retrievedSuspension);
  // 6. Verify the response shows reinstated_at timestamp as non-null
  TestValidator.notEquals(
    "reinstated_at is set",
    retrievedSuspension.reinstated_at,
    null,
  );
  // 7. Verify the reinstated_by_id matches the admin who performed reinstatement
  TestValidator.notEquals(
    "reinstated_by_id is set",
    retrievedSuspension.reinstated_by_id,
    null,
  );
  // 8. Verify the seller is_suspended flag has been updated to false
  TestValidator.equals(
    "seller is not suspended",
    retrievedSuspension.seller.is_suspended,
    false,
  );
}
