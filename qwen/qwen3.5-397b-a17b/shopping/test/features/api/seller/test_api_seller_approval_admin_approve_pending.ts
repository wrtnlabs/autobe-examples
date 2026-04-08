import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

/**
 * Test administrator approval of pending seller registration request.
 *
 * Validates the complete seller approval workflow including seller registration with pending status, administrator authentication, and admin approval of the seller account. Ensures that the approval status changes correctly from 'pending' to 'approved' and that the seller can subsequently authenticate.
 *
 * Special attention is given to verifying that the approval_status field is updated correctly, rejection_reason is null after approval, and the updated_at timestamp reflects the modification time. The test also validates that approved sellers can successfully login to access seller features.
 *
 * 1. Administrator registers account via /shoppingMall/auth/admin/join.
 * 2. Seller registers account via /shoppingMall/auth/seller/join with approval_status 'pending'.
 * 3. Administrator updates seller via PUT /shoppingMall/admin/sellers/{sellerId} with approval_status 'approved'.
 * 4. Validates seller approval_status changed to 'approved' and rejection_reason is null.
 * 5. Validates seller can now login with credentials (only approved sellers can authenticate).
 */
export async function test_api_seller_approval_admin_approve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Seller registration (creates pending seller)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // Verify seller starts with pending status
  TestValidator.equals(
    "initial approval status",
    sellerAuth.approval_status,
    "pending",
  );
  TestValidator.predicate(
    "rejection_reason is null for pending",
    sellerAuth.rejection_reason === null ||
      sellerAuth.rejection_reason === undefined,
  );
  // 3. Administrator approves seller
  const updatedSeller = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId: sellerAuth.id,
      body: {
        approval_status: "approved",
        rejection_reason: null,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller);
  // 4. Validate approval status changed
  TestValidator.equals(
    "approval status after admin approval",
    updatedSeller.approval_status,
    "approved",
  );
  TestValidator.predicate(
    "rejection_reason is null after approval",
    updatedSeller.rejection_reason === null ||
      updatedSeller.rejection_reason === undefined,
  );
  TestValidator.notEquals(
    "updated_at changed",
    sellerAuth.updated_at,
    updatedSeller.updated_at,
  );
  // 5. Validate seller can now login (only approved sellers can authenticate)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuth = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoginAuth);
  // Verify logged-in seller has approved status
  TestValidator.equals(
    "seller status after login",
    sellerLoginAuth.approval_status,
    "approved",
  );
}
