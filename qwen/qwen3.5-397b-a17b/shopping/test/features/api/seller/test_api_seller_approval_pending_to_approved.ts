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

export async function test_api_seller_approval_pending_to_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account with known credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoin = await authorize_admin_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Login as admin with correct credentials
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 3. Create seller account (will be in PENDING status)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name();
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: shopName,
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // Verify seller is in PENDING status
  TestValidator.equals(
    "seller initial status is PENDING",
    sellerJoin.approval_status,
    "PENDING",
  );
  TestValidator.equals(
    "seller has no approvedByAdmin initially",
    sellerJoin.approvedByAdmin,
    null,
  );
  // 4. Admin approves the seller
  const approvedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerJoin.id,
    });
  typia.assert(approvedSeller);
  // 5. Validate approval results
  TestValidator.equals(
    "seller status changed to APPROVED",
    approvedSeller.approval_status,
    "APPROVED",
  );
  TestValidator.predicate(
    "approvedByAdmin is populated",
    approvedSeller.approvedByAdmin !== null,
  );
  if (approvedSeller.approvedByAdmin !== null) {
    TestValidator.equals(
      "approvedByAdmin matches admin who approved",
      approvedSeller.approvedByAdmin.id,
      adminJoin.id,
    );
    TestValidator.equals(
      "approvedByAdmin email matches",
      approvedSeller.approvedByAdmin.email,
      adminJoin.email,
    );
  }
  TestValidator.predicate(
    "rejection_reason is null or undefined after approval",
    approvedSeller.rejection_reason === null ||
      approvedSeller.rejection_reason === undefined,
  );
  // 6. Verify seller ID and other fields preserved
  TestValidator.equals("seller ID preserved", approvedSeller.id, sellerJoin.id);
  TestValidator.equals(
    "seller email preserved",
    approvedSeller.email,
    sellerJoin.email,
  );
  TestValidator.equals(
    "shop name preserved",
    approvedSeller.shop_name,
    shopName,
  );
}