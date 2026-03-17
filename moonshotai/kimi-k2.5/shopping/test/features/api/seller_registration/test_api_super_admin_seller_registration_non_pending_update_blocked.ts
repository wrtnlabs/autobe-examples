import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
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
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_super_admin_seller_registration_non_pending_update_blocked(
  connection: api.IConnection,
) {
  // Step 1: Create a seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Step 2: Create a seller registration in pending status
  const pendingRegistration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(pendingRegistration);
  // Step 3: Super admin login
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies IEcommerceMallSuperAdmin.ILogin,
  });
  // Step 4: Approve the registration (transition to non-pending status)
  const approvedRegistration =
    await api.functional.ecommerceMall.superAdmin.sellers.registrations.review(
      superAdminConnection,
      {
        registrationId: (pendingRegistration as IEntity).id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerRegistration.IReview,
      },
    );
  typia.assert(approvedRegistration);
  // Step 5: Attempt to update the approved registration - should be blocked
  await TestValidator.error(
    "update blocked for non-pending seller registration",
    async () => {
      await api.functional.ecommerceMall.superAdmin.seller_registrations.update(
        superAdminConnection,
        {
          registrationId: (pendingRegistration as IEntity).id,
          body: {
            status: "rejected",
            rejection_reason: "Attempting to update after approval",
          } satisfies IEcommerceMallSellerRegistration.IUpdate,
        },
      );
    },
  );
}
