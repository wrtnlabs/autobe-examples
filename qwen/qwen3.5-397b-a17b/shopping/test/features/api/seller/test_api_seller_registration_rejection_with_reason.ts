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

export async function test_api_seller_registration_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create seller in PENDING status
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Verify seller is in PENDING status initially
  TestValidator.equals(
    "seller initial status",
    sellerAuth.approval_status,
    "PENDING",
  );
  TestValidator.predicate(
    "no approvedByAdmin initially",
    sellerAuth.approvedByAdmin === null,
  );
  // 3. Admin rejects seller registration with reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedSeller =
    await api.functional.shoppingMall.admin.admin.sellers.reject(
      adminConnection,
      {
        sellerId: sellerAuth.id,
        body: {
          reason: rejectionReason,
        } satisfies IShoppingMallSeller.IReject,
      },
    );
  typia.assert(rejectedSeller);
  // 4. Validate rejection results
  TestValidator.equals(
    "approval status changed to REJECTED",
    rejectedSeller.approval_status,
    "REJECTED",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedSeller.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "approvedByAdmin is populated",
    rejectedSeller.approvedByAdmin !== null,
  );
  if (rejectedSeller.approvedByAdmin !== null) {
    TestValidator.equals(
      "approvedByAdmin id matches admin",
      rejectedSeller.approvedByAdmin.id,
      adminAuth.id,
    );
    TestValidator.equals(
      "approvedByAdmin email matches admin",
      rejectedSeller.approvedByAdmin.email,
      adminAuth.email,
    );
  }
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(rejectedSeller.updated_at) > new Date(rejectedSeller.created_at),
  );
  TestValidator.equals("seller id preserved", rejectedSeller.id, sellerAuth.id);
  TestValidator.equals(
    "seller email preserved",
    rejectedSeller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "shop name preserved",
    rejectedSeller.shop_name,
    sellerAuth.shop_name,
  );
}