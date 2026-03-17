import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
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
 * Test administrator retrieval of pending seller registration requests.
 *
 * This test validates the workflow where an admin:
 * 1. Creates an admin account and authenticates
 * 2. Creates multiple seller registration requests (PENDING status by default)
 * 3. Retrieves the pending sellers list via admin endpoint
 * 4. Verifies response contains correct seller information
 * 5. Validates pagination metadata and sorting order
 */
export async function test_api_seller_pending_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 2. Admin login for authenticated session
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 3. Create first pending seller registration
  const seller1Password = RandomGenerator.alphaNumeric(16);
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1);
  // Wait a small delay to ensure different created_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 4. Create second pending seller registration
  const seller2Password = RandomGenerator.alphaNumeric(16);
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2);
  // 5. Retrieve pending sellers list as admin
  const pendingResult =
    await api.functional.shoppingMall.admin.sellers.pending.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(pendingResult);
  // 6. Validate pagination metadata
  TestValidator.equals("current page", pendingResult.pagination.current, 1);
  TestValidator.equals("limit", pendingResult.pagination.limit, 20);
  TestValidator.predicate(
    "total records >= 2",
    pendingResult.pagination.records >= 2,
  );
  TestValidator.predicate(
    "total pages >= 1",
    pendingResult.pagination.pages >= 1,
  );
  // 7. Validate pending sellers exist
  TestValidator.predicate(
    "has pending sellers",
    pendingResult.data.length >= 2,
  );
  // 8. Find our created sellers in the result
  const foundSeller1 = pendingResult.data.find((s) => s.id === seller1.id);
  const foundSeller2 = pendingResult.data.find((s) => s.id === seller2.id);
  TestValidator.predicate(
    "seller1 found in pending list",
    foundSeller1 !== undefined,
  );
  TestValidator.predicate(
    "seller2 found in pending list",
    foundSeller2 !== undefined,
  );
  // 9. Validate seller1 details
  if (foundSeller1) {
    TestValidator.equals("seller1 email", foundSeller1.email, seller1.email);
    TestValidator.equals(
      "seller1 shop_name",
      foundSeller1.shop_name,
      seller1.shop_name,
    );
    TestValidator.equals(
      "seller1 approval_status",
      foundSeller1.approval_status,
      "PENDING",
    );
    TestValidator.predicate(
      "seller1 approvedByAdmin is null",
      foundSeller1.approvedByAdmin === null,
    );
    TestValidator.predicate(
      "seller1 has created_at",
      foundSeller1.created_at !== undefined,
    );
  }
  // 10. Validate seller2 details
  if (foundSeller2) {
    TestValidator.equals("seller2 email", foundSeller2.email, seller2.email);
    TestValidator.equals(
      "seller2 shop_name",
      foundSeller2.shop_name,
      seller2.shop_name,
    );
    TestValidator.equals(
      "seller2 approval_status",
      foundSeller2.approval_status,
      "PENDING",
    );
    TestValidator.predicate(
      "seller2 approvedByAdmin is null",
      foundSeller2.approvedByAdmin === null,
    );
    TestValidator.predicate(
      "seller2 has created_at",
      foundSeller2.created_at !== undefined,
    );
  }
  // 11. Validate sorting order (created_at ascending - oldest first)
  if (foundSeller1 && foundSeller2) {
    const seller1Time = new Date(foundSeller1.created_at).getTime();
    const seller2Time = new Date(foundSeller2.created_at).getTime();
    TestValidator.predicate(
      "sellers sorted by created_at ascending",
      seller1Time <= seller2Time,
    );
  }
  // 12. Validate all sellers in list have PENDING status
  pendingResult.data.forEach((seller) => {
    TestValidator.equals(
      `seller ${seller.id} approval_status`,
      seller.approval_status,
      "PENDING",
    );
    TestValidator.predicate(
      `seller ${seller.id} approvedByAdmin is null`,
      seller.approvedByAdmin === null,
    );
  });
}