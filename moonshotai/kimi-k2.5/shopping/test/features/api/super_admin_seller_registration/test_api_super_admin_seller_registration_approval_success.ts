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

export async function test_api_super_admin_seller_registration_approval_success(
  connection: api.IConnection,
) {
  // 1. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Submit seller registration application
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {
        body: {
          taxIdentificationNumber: RandomGenerator.alphaNumeric(12),
          businessRegistrationNumber: RandomGenerator.alphaNumeric(12),
          businessName: RandomGenerator.name(),
          businessAddress: RandomGenerator.paragraph({ sentences: 3 }),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(registration);
  // 4. Super admin approves the registration
  const registrationId = (registration as any).id;
  const approvedRegistration =
    await api.functional.ecommerceMall.superAdmin.seller_registrations.update(
      superAdminConnection,
      {
        registrationId,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(approvedRegistration);
  // 5. Validate approval results
  const result = approvedRegistration as any;
  TestValidator.equals(
    "registration status changed to approved",
    result.status,
    "approved",
  );
  TestValidator.equals(
    "reviewer_id set to super admin",
    result.reviewer_id,
    superAdmin.id,
  );
  TestValidator.predicate(
    "reviewed_at timestamp is populated",
    () => result.reviewed_at !== null && result.reviewed_at !== undefined,
  );
}
