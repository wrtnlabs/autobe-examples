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

export async function test_api_seller_suspension_restore_already_restored(
  connection: api.IConnection,
): Promise<void> {
  // Generate consistent credentials for admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // 1. Register admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason:
        "Need admin access for testing seller suspension restoration idempotency",
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000/",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Login as admin to get full authorization
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000/",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Register a new seller to be suspended
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 3. Create seller suspension
  const suspension =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.create(
      adminLoginConnection,
      {
        body: {
          sellerId: sellerAuth.id,
          reason: "Test suspension for idempotency testing",
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension);
  // 4. First restoration - should succeed
  const firstRestore =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.restore(
      adminLoginConnection,
      {
        suspensionId: suspension.id,
        body: {
          restoredReason: "First restoration - should succeed",
        } satisfies IEcommerceMallSellerSuspension.IRestore,
      },
    );
  typia.assert(firstRestore);
  // Verify first restoration succeeded
  TestValidator.equals(
    "restoredAt should be populated",
    firstRestore.restoredAt !== null,
    true,
  );
  TestValidator.equals(
    "restoredBy should be populated",
    firstRestore.restoredBy !== null,
    true,
  );
  TestValidator.equals(
    "restoredReason should match",
    firstRestore.restoredReason,
    "First restoration - should succeed",
  );
  // Store original restoredAt for comparison
  const originalRestoredAt = firstRestore.restoredAt;
  // 5. Second restoration attempt - should fail with HTTP 400
  await TestValidator.httpError(
    "already restored suspension returns 400",
    400,
    async () => {
      await api.functional.ecommerceMall.admin.admin.seller_suspensions.restore(
        adminLoginConnection,
        {
          suspensionId: suspension.id,
          body: {
            restoredReason: "Second restoration attempt - should fail",
          } satisfies IEcommerceMallSellerSuspension.IRestore,
        },
      );
    },
  );
  // 6. Verify original restoration data unchanged
  TestValidator.equals(
    "restoredAt unchanged after failed second restore",
    firstRestore.restoredAt,
    originalRestoredAt,
  );
}
