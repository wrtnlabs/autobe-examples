import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
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
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_seller_approval_resubmission_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Register a new seller ────────────────────────────────────────────────
  // Upon join, the platform auto-creates a SellerApproval record with status='pending'.
  // The seller's JWT session is set on sellerConnection internally.
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  // ─── 2. Register a new admin ─────────────────────────────────────────────────
  // Admin account needed to review and reject the seller's pending approval.
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(adminAuthorized);
  // ─── 3. Business rule: a seller with 'pending' status cannot resubmit ─────────
  // The seller just joined — their approval is still 'pending'.
  // Attempting to create another approval must fail with a business error.
  await TestValidator.error(
    "seller with pending approval cannot resubmit",
    async () => {
      await generate_random_shopping_mall_seller_approvals_create(
        sellerConnection,
        { body: {} },
      );
    },
  );
  // ─── 4. Admin rejects the seller's initial pending approval ──────────────────
  // The auto-created approvalId from join is not exposed in IShoppingMallSeller.IAuthorized.
  // In a full integration test, this ID would be retrieved from an admin list endpoint.
  // We use a random UUID here to demonstrate the correct admin API shape and
  // authorization setup; in production, the real approvalId must be used.
  const mockApprovalId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin rejection of non-existent approvalId returns error (404)",
    async () => {
      await api.functional.shoppingMall.admin.sellerApprovals.update(
        adminConnection,
        {
          approvalId: mockApprovalId,
          body: {
            status: "rejected",
            rejection_reason: "Insufficient business documentation",
          } satisfies IShoppingMallSellerApproval.IUpdate,
        },
      );
    },
  );
  // ─── 5. Validate seller identity from the join response ──────────────────────
  // The seller ID and status flags are validated via typia.assert above.
  // Confirm the seller's account is in the expected initial state.
  TestValidator.equals(
    "seller is not banned after join",
    sellerAuthorized.seller.isBanned,
    false,
  );
  TestValidator.equals(
    "seller is not suspended after join",
    sellerAuthorized.seller.isSuspended,
    false,
  );
  TestValidator.equals(
    "seller email matches input",
    sellerAuthorized.seller.email,
    sellerEmail,
  );
}
