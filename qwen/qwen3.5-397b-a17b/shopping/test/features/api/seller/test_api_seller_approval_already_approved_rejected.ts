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
 * Test seller approval business rule validation.
 *
 * This test validates that the system prevents approving sellers who are not
 * in PENDING status. The primary scenario tested is attempting to approve a
 * seller that is already APPROVED, which should fail with a business logic error.
 *
 * This ensures the approval workflow maintains integrity and prevents
 * duplicate approvals.
 */
export async function test_api_seller_approval_already_approved_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminJoinResult = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminJoinResult.token.access
        ? "placeholder"
        : RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Create first seller account (starts in PENDING status)
  const seller1Join = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1Join);
  TestValidator.equals(
    "seller1 initial approval status",
    seller1Join.approval_status,
    "PENDING",
  );
  // 3. Approve the first seller (PENDING → APPROVED)
  const approvedSeller1 =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller1Join.id,
    });
  typia.assert(approvedSeller1);
  TestValidator.equals(
    "seller1 approval status after first approval",
    approvedSeller1.approval_status,
    "APPROVED",
  );
  TestValidator.notEquals(
    "seller1 has approving admin",
    approvedSeller1.approvedByAdmin,
    null,
  );
  // 4. Attempt to approve already APPROVED seller - should fail with business error
  await TestValidator.error(
    "cannot approve already approved seller",
    async () => {
      await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
        sellerId: seller1Join.id,
      });
    },
  );
  // 5. Create second seller account to test the same pattern
  const seller2Join = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2Join);
  TestValidator.equals(
    "seller2 initial approval status",
    seller2Join.approval_status,
    "PENDING",
  );
  // 6. Approve seller2 (PENDING → APPROVED)
  const approvedSeller2 =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller2Join.id,
    });
  typia.assert(approvedSeller2);
  TestValidator.equals(
    "seller2 approval status after approval",
    approvedSeller2.approval_status,
    "APPROVED",
  );
  // 7. Attempt to approve seller2 again - should fail with business error
  await TestValidator.error(
    "cannot approve seller2 that is already approved",
    async () => {
      await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
        sellerId: seller2Join.id,
      });
    },
  );
}
