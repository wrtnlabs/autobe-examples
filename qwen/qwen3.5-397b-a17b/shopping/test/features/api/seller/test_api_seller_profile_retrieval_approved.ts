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

export async function test_api_seller_profile_retrieval_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a seller account (initially PENDING status)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name();
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: shopName,
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Verify seller is initially PENDING
  TestValidator.equals(
    "initial approval status",
    sellerAuth.approval_status,
    "PENDING",
  );
  TestValidator.equals(
    "initial approvedByAdmin",
    sellerAuth.approvedByAdmin,
    null,
  );
  const sellerId = sellerAuth.id;
  // 3. Approve the seller registration as admin
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerId,
    });
  typia.assert(approvedSeller);
  // Verify approval status changed to APPROVED
  TestValidator.equals(
    "approval status after approve",
    approvedSeller.approval_status,
    "APPROVED",
  );
  TestValidator.predicate(
    "approvedByAdmin is set",
    approvedSeller.approvedByAdmin !== null,
  );
  // 4. Retrieve the seller profile using admin seller retrieval endpoint
  const retrievedSeller = await api.functional.shoppingMall.admin.sellers.at(
    adminConnection,
    {
      sellerId: sellerId,
    },
  );
  typia.assert(retrievedSeller);
  // 5. Validate response contains expected fields
  TestValidator.equals(
    "shop name matches",
    retrievedSeller.shop_name,
    shopName,
  );
  TestValidator.equals(
    "approval status is APPROVED",
    retrievedSeller.approval_status,
    "APPROVED",
  );
  TestValidator.predicate(
    "shop description exists",
    retrievedSeller.shop_description !== null &&
      retrievedSeller.shop_description !== undefined,
  );
  TestValidator.predicate(
    "logo image url exists",
    retrievedSeller.logo_image_url !== null &&
      retrievedSeller.logo_image_url !== undefined,
  );
  // 6. Verify approvedByAdmin contains admin information
  TestValidator.predicate(
    "approvedByAdmin is not null",
    retrievedSeller.approvedByAdmin !== null,
  );
  if (retrievedSeller.approvedByAdmin !== null) {
    TestValidator.equals(
      "approving admin ID matches",
      retrievedSeller.approvedByAdmin.id,
      adminAuth.id,
    );
    TestValidator.equals(
      "approving admin email matches",
      retrievedSeller.approvedByAdmin.email,
      adminAuth.email,
    );
    TestValidator.equals(
      "approving admin grade",
      retrievedSeller.approvedByAdmin.grade,
      "ADMIN",
    );
  }
  // 7. Verify sensitive fields are not exposed (email should be present in admin view per DTO)
  TestValidator.equals(
    "seller email matches",
    retrievedSeller.email,
    sellerEmail,
  );
}
