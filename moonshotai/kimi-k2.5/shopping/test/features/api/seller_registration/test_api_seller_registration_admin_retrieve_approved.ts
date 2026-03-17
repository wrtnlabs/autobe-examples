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
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_seller_registration_admin_retrieve_approved(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account for approval operations
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Create seller account to submit registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Submit seller registration application
  const registration = typia.assert<IEcommerceMallSellerRegistration & IEntity>(
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    ),
  );
  // Admin approves the seller registration
  const approvedRegistration =
    await api.functional.ecommerceMall.admin.sellers.registrations.review(
      adminConnection,
      {
        registrationId: registration.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerRegistration.IReview,
      },
    );
  typia.assert(approvedRegistration);
  // Retrieve the approved registration
  const retrievedRegistration =
    await api.functional.ecommerceMall.admin.registrations.at(adminConnection, {
      registrationId: registration.id,
    });
  typia.assert(retrievedRegistration);
  // Validate that retrieved registration matches the approved state
  TestValidator.equals(
    "retrieved registration matches approved",
    retrievedRegistration,
    approvedRegistration,
  );
}