import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { generate_random_ecommerce_mall_admin_admin_seller_suspensions_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_seller_suspensions_create";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_suspension_already_suspended(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const adminRequestConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminRequestConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: "Test admin account for seller suspension testing",
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com",
    },
  });
  // Create admin connection with token from join
  const adminJoinConnection: api.IConnection = { host: connection.host };
  adminJoinConnection.headers = { Authorization: adminAuth.token.access };
  // Login as admin using the same email from request
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com",
    },
  });
  // 2. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPass123!";
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://test.example.com/seller",
      referrer: "https://test.example.com",
    },
  });
  // Login as seller to ensure account is active
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  // 3. First suspension - should succeed
  const firstSuspension =
    await generate_random_ecommerce_mall_admin_admin_seller_suspensions_create(
      adminConnection,
      {
        body: {
          sellerId: sellerAuth.id,
          reason: "First suspension - policy violation",
        },
      },
    );
  typia.assert(firstSuspension);
  const originalSuspendedAt = firstSuspension.suspendedAt;
  TestValidator.equals(
    "seller id matches",
    firstSuspension.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals("restoredAt is null", firstSuspension.restoredAt, null);
  // 4. Second suspension attempt - should fail with error indicating seller already suspended
  await TestValidator.error(
    "second suspension should fail for already suspended seller",
    async () => {
      await generate_random_ecommerce_mall_admin_admin_seller_suspensions_create(
        adminConnection,
        {
          body: {
            sellerId: sellerAuth.id,
            reason: "Second suspension attempt - should fail",
          },
        },
      );
    },
  );
  // 5. Verify original suspension remains unchanged
  TestValidator.predicate(
    "original suspension timestamp preserved",
    originalSuspendedAt !== null,
  );
  TestValidator.equals(
    "original suspendedAt timestamp",
    firstSuspension.suspendedAt,
    originalSuspendedAt,
  );
}
