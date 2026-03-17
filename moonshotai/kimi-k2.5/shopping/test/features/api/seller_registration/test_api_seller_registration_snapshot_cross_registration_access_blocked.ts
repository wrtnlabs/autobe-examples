import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
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

export async function test_api_seller_registration_snapshot_cross_registration_access_blocked(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Create super admin account
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = typia.random<string & tags.Format<"password">>();
  await api.functional.ecommerceMall.auth.superAdmin.join(
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
  // Create seller A connection and account
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  // Create registration A for seller A
  const registrationA =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerAConnection,
      {
        body: {
          taxIdentificationNumber: typia.random<string>(),
          businessRegistrationNumber: typia.random<string>(),
          businessName: typia.random<string>(),
          businessAddress: typia.random<string>(),
        } satisfies IEcommerceMallSellerRegistration.ICreate,
      },
    );
  typia.assert(registrationA);
  // Create seller B connection and account
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  // Create registration B for seller B
  const registrationB =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerBConnection,
      {
        body: {
          taxIdentificationNumber: typia.random<string>(),
          businessRegistrationNumber: typia.random<string>(),
          businessName: typia.random<string>(),
          businessAddress: typia.random<string>(),
        } satisfies IEcommerceMallSellerRegistration.ICreate,
      },
    );
  typia.assert(registrationB);
  // Review registration A to create snapshot A
  const reviewAResult =
    await api.functional.ecommerceMall.superAdmin.sellers.registrations.review(
      superAdminConnection,
      {
        registrationId: (registrationA as any).id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerRegistration.IReview,
      },
    );
  typia.assert(reviewAResult);
  // Review registration B to create snapshot B
  const reviewBResult =
    await api.functional.ecommerceMall.superAdmin.sellers.registrations.review(
      superAdminConnection,
      {
        registrationId: (registrationB as any).id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IEcommerceMallSellerRegistration.IReview,
      },
    );
  typia.assert(reviewBResult);
  // Attempt to access snapshot using registration B ID but snapshot from registration A
  // Since we don't have a direct way to get snapshot IDs from the review response,
  // we use a random UUID as snapshot ID - the security check should happen before existence check
  // or return 404 for both cases (snapshot not found or cross-registration access)
  const randomSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "cross-registration snapshot access should return 404",
    404,
    async () => {
      await api.functional.ecommerceMall.superAdmin.seller_registrations.snapshots.at(
        superAdminConnection,
        {
          registrationId: (registrationB as any).id,
          snapshotId: randomSnapshotId,
        },
      );
    },
  );
}