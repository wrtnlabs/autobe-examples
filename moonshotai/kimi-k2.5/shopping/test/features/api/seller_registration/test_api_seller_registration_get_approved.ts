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

export async function test_api_seller_registration_get_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Create and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(seller);
  // 3. Create seller registration
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(registration);
  const registrationId = (registration as any).id;
  const createdAt = (registration as any).created_at;
  // 4. Super admin approves the registration
  const approvedRegistration =
    await api.functional.ecommerceMall.superAdmin.sellers.registrations.review(
      superAdminConnection,
      {
        registrationId: registrationId,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerRegistration.IReview,
      },
    );
  typia.assert(approvedRegistration);
  // 5. Retrieve the registration as seller
  const retrievedRegistration =
    await api.functional.ecommerceMall.seller.seller_registrations.at(
      sellerConnection,
      {
        registrationId: registrationId,
      },
    );
  typia.assert(retrievedRegistration);
  // 6. Verify registration fields
  const result = retrievedRegistration as any;
  TestValidator.equals("status is approved", result.status, "approved");
  TestValidator.equals(
    "reviewer_id matches super admin",
    result.reviewer_id,
    superAdmin.id,
  );
  TestValidator.predicate(
    "reviewed_at is present",
    result.reviewed_at !== null && result.reviewed_at !== undefined,
  );
  TestValidator.predicate(
    "reviewed_at is later than created_at",
    new Date(result.reviewed_at) > new Date(createdAt),
  );
  TestValidator.equals(
    "rejection_reason is null",
    result.rejection_reason,
    null,
  );
}
