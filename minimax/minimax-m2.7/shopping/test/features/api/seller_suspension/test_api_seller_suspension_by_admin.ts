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

export async function test_api_seller_suspension_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration via join request
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: "Test admin privileges for seller management testing",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  // 2. Admin login to get proper admin session
  const loggedInAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(loggedInAdminConnection, {
    body: {
      email: adminAuth.email,
      password: "1234",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  // 3. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "1234",
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  // 4. Seller login (need approved seller to suspend)
  const loggedInSellerConnection: api.IConnection = { host: connection.host };
  const loggedInSeller = await authorize_seller_login(
    loggedInSellerConnection,
    {
      body: {
        email: sellerAuth.email,
        password: "1234",
      },
    },
  );
  // 5. Admin creates seller suspension with valid reason
  const suspensionReason =
    "Violation of platform terms: selling counterfeit products";
  const suspension =
    await generate_random_ecommerce_mall_admin_admin_seller_suspensions_create(
      loggedInAdminConnection,
      {
        body: {
          sellerId: loggedInSeller.id,
          reason: suspensionReason,
        },
      },
    );
  typia.assert(suspension);
  // 6. Validate suspension record
  TestValidator.equals(
    "suspension reason matches",
    suspension.reason,
    suspensionReason,
  );
  TestValidator.equals(
    "sellerId matches target seller",
    suspension.seller.id,
    loggedInSeller.id,
  );
  TestValidator.predicate(
    "suspendedAt is set",
    suspension.suspendedAt !== null && suspension.suspendedAt !== undefined,
  );
  TestValidator.equals("restoredAt is null", suspension.restoredAt, null);
  // 7. Validate seller summary in response
  TestValidator.equals(
    "seller email matches",
    suspension.seller.email,
    sellerEmail,
  );
  // 8. Validate suspendedBy admin summary in response
  TestValidator.equals(
    "suspendedBy admin id matches",
    suspension.suspendedBy.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "suspendedBy admin name matches",
    suspension.suspendedBy.name,
    adminAuth.name,
  );
}
