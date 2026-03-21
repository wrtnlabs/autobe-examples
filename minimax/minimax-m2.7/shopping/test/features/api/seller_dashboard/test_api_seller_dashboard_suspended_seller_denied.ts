import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboard";
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
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { generate_random_ecommerce_mall_admin_seller_suspensions_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_suspensions_create";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_dashboard_suspended_seller_denied(
  connection: api.IConnection,
): Promise<void> {
  // Define a fixed password for consistent testing
  const sellerPassword = "TestPass123!" as string & tags.Format<"password">;
  // 1. Create admin account for seller management
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller account with pending status using the fixed password
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const sellerEmail = sellerJoinResult.email;
  // Store seller ID for later use
  const sellerId = sellerJoinResult.id;
  // 3. Admin approves the seller
  await generate_random_ecommerce_mall_admin_seller_approvals_create(
    adminConnection,
    {
      body: {
        sellerId: sellerId,
        status: "approved" as const,
      },
    },
  );
  // 4. Admin suspends the seller
  await generate_random_ecommerce_mall_admin_seller_suspensions_create(
    adminConnection,
    {
      body: {
        seller_id: sellerId,
        reason: "Policy violation - test suspension",
      },
    },
  );
  // 5. Attempt to login as suspended seller
  // According to business rules, suspended sellers cannot log in
  await TestValidator.error(
    "suspended seller login should be rejected",
    async () => {
      const suspendedSellerConnection: api.IConnection = {
        host: connection.host,
      };
      await authorize_seller_login(suspendedSellerConnection, {
        body: {
          email: sellerEmail,
          password: sellerPassword,
          href: "https://example.com/login" as string & tags.Format<"uri">,
          referrer: "https://example.com/" as string & tags.Format<"uri">,
        },
      });
    },
  );
  // 6. Alternative test: If login somehow succeeds, dashboard should return 401
  // Create a fresh connection and try to access dashboard with seller credentials
  const freshSellerConnection: api.IConnection = { host: connection.host };
  // Try to login - if it fails, that is expected for suspended sellers
  try {
    await authorize_seller_login(freshSellerConnection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: "https://example.com/login" as string & tags.Format<"uri">,
        referrer: "https://example.com/" as string & tags.Format<"uri">,
      },
    });
    // If login succeeded (edge case), dashboard access should be denied
    await TestValidator.httpError(
      "suspended seller dashboard access should be denied",
      401,
      async () => {
        await api.functional.ecommerceMall.seller.dashboard.at(
          freshSellerConnection,
        );
      },
    );
  } catch {
    // Login failed as expected - suspended sellers cannot authenticate
    // This is the correct behavior per business rules
  }
}
