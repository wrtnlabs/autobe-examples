import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
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

/**
 * Test seller account deletion success when all business conditions are satisfied.
 *
 * Validates the complete seller account deletion flow including seller registration,
 * administrator approval, and account deletion. Ensures that a seller with no pending
 * orders, cancellation requests, or refund requests can successfully delete their account.
 *
 * The deletion should result in:
 * - 204 No Content response
 * - Soft deletion with deleted_at timestamp set
 * - Products removed from marketplace listings
 * - Order history preserved for customers
 * - Product/seller profile snapshots in past orders preserved
 *
 * 1. Register a new seller with pending approval status.
 * 2. Register and authenticate as administrator.
 * 3. Admin approves the seller registration.
 * 4. Seller authenticates with approved account.
 * 5. Seller deletes their account (no pending business obligations).
 * 6. Validates deletion was successful (204 status).
 * 7. Validates seller can no longer login after deletion.
 */
export async function test_api_seller_account_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller with pending status
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthResult = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthResult);
  const sellerId = sellerAuthResult.id;
  // 2. Register and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Admin approves the seller registration
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId },
    );
  typia.assert(approvedSeller);
  // Validate approval status changed to approved
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approvalStatus,
    "approved",
  );
  // 4. Seller authenticates with approved account (new connection for seller)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(sellerLoginResult);
  // Validate seller can login after approval
  TestValidator.equals(
    "seller approval status after approval",
    sellerLoginResult.approvalStatus,
    "approved",
  );
  // 5. Seller deletes their account (no pending business obligations)
  await api.functional.ecommerceMall.seller.seller.account.erase(
    sellerLoginConnection,
  );
  // 6. Validate deletion was successful - the call above should complete without error (204 No Content)
  // Since erase returns void, we validate by checking seller can no longer login
  // 7. Validate seller can no longer login after deletion
  const deletedSellerConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "seller cannot login after account deletion",
    async () => {
      await api.functional.ecommerceMall.auth.seller.login(
        deletedSellerConnection,
        {
          body: {
            email: sellerEmail,
            password: sellerPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          },
        },
      );
    },
  );
}
