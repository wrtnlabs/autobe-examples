import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_suspension_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Generate a valid UUID for sellerId (since no seller creation API exists)
  const sellerId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Call suspend function with valid admin connection and generated sellerId
  const suspendedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.admins.sellers.suspend(
      adminConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(suspendedSeller);
  // Step 4: Validate that the returned seller object has expected properties
  // Even though we didn't create a real seller, the API should return a valid IShoppingMallSeller structure
  TestValidator.equals(
    "seller is suspended",
    suspendedSeller.is_suspended,
    true,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    suspendedSeller.updated_at !== null &&
      suspendedSeller.updated_at !== undefined,
  );
  TestValidator.predicate(
    "created_at timestamp is set",
    suspendedSeller.created_at !== null &&
      suspendedSeller.created_at !== undefined,
  );
  TestValidator.predicate(
    "approval_status is one of valid values",
    suspendedSeller.approval_status === "pending_approval" ||
      suspendedSeller.approval_status === "approved" ||
      suspendedSeller.approval_status === "rejected",
  );
  // Note: We cannot test the suspension effect (like login failure) because:
  // 1. We don't have a real seller account to authenticate with
  // 2. We have no way to create or retrieve a real seller
  // 3. We cannot verify shop_name as it's a nullable field and we have no data
  // This test validates that the suspend endpoint works correctly and returns
  // the expected IShoppingMallSeller structure with is_suspended: true and updated_at set
}
