import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
 * Test seller registration rejection on already approved seller.
 *
 * This test validates the business rule that only pending seller registrations
 * can be rejected. The test creates a seller, approves them, then attempts to
 * reject the already-approved seller, which should fail with an error.
 *
 * Flow:
 * 1. Admin creates account and logs in
 * 2. Seller registers (approval_status: PENDING)
 * 3. Admin approves seller (approval_status: APPROVED)
 * 4. Admin attempts to reject approved seller (should fail)
 */
export async function test_api_seller_registration_rejection_already_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator credentials and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create seller account (starts as PENDING)
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller starts pending",
    sellerAuth.approval_status,
    "PENDING",
  );
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller now approved",
    approvedSeller.approval_status,
    "APPROVED",
  );
  // 4. Attempt to reject already-approved seller (should fail)
  await TestValidator.error("cannot reject approved seller", async () => {
    await api.functional.shoppingMall.admin.admin.sellers.reject(
      adminConnection,
      {
        sellerId: sellerAuth.id,
        body: {
          reason:
            "This rejection should fail because seller is already approved",
        } satisfies IShoppingMallSeller.IReject,
      },
    );
  });
}
