import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
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
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

/**
 * Test retrieving a seller's shop profile successfully after they have been approved.
 *
 * 1. Create superAdmin account for approving registration
 * 2. Create admin account for retrieving profile
 * 3. Create seller account
 * 4. Seller submits registration application with required business information
 * 5. SuperAdmin approves the registration
 * 6. Admin retrieves seller profile and validates non-null fields
 */
export async function test_api_seller_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin for approving registration
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoined =
    await api.functional.ecommerceMall.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: superAdminPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceMallSuperAdmin.IJoin,
      },
    );
  typia.assert(superAdminJoined);
  // Create admin for retrieving profile
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoined = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  typia.assert(sellerJoined);
  // Submit seller registration with all required business information
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {
        body: {
          taxIdentificationNumber: RandomGenerator.alphaNumeric(10),
          businessRegistrationNumber: RandomGenerator.alphaNumeric(10),
          businessName: RandomGenerator.name(),
          businessAddress: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(registration);
  // SuperAdmin approves the registration
  await api.functional.ecommerceMall.superAdmin.sellers.registrations.review(
    superAdminConnection,
    {
      registrationId: (
        registration as {
          id: string & tags.Format<"uuid">;
        }
      ).id,
      body: {
        status: "approved",
        rejection_reason: null,
      } satisfies IEcommerceMallSellerRegistration.IReview,
    },
  );
  // Admin retrieves seller profile
  const profile = await api.functional.ecommerceMall.admin.sellers.profile.at(
    adminConnection,
    {
      sellerId: sellerJoined.id,
    },
  );
  typia.assert(profile);
  // Validate profile fields are non-null as per scenario requirements
  TestValidator.predicate("shopName is not null", profile.shopName !== null);
  TestValidator.predicate(
    "shopDescription is not null",
    profile.shopDescription !== null,
  );
  TestValidator.predicate(
    "logoImageUrl is not null",
    profile.logoImageUrl !== null,
  );
  TestValidator.predicate("createdAt is not null", profile.createdAt !== null);
}
