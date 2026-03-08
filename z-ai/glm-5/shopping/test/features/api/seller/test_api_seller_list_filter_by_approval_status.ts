import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_list_filter_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Filter by approvalStatus='pending'
  const pendingResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        approvalStatus: "pending",
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(pendingResult);
  // Verify all sellers have approval_status='pending'
  for (const seller of pendingResult.data) {
    TestValidator.equals(
      "pending seller should have approval_status='pending'",
      seller.approval_status,
      "pending",
    );
  }
  // Test 2: Filter by approvalStatus='approved'
  const approvedResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        approvalStatus: "approved",
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(approvedResult);
  // Verify all sellers have approval_status='approved'
  for (const seller of approvedResult.data) {
    TestValidator.equals(
      "approved seller should have approval_status='approved'",
      seller.approval_status,
      "approved",
    );
  }
  // Test 3: Filter by approvalStatus='rejected'
  const rejectedResult = await api.functional.shoppingMall.sellers.index(
    connection,
    {
      body: {
        approvalStatus: "rejected",
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(rejectedResult);
  // Verify all sellers have approval_status='rejected'
  for (const seller of rejectedResult.data) {
    TestValidator.equals(
      "rejected seller should have approval_status='rejected'",
      seller.approval_status,
      "rejected",
    );
  }
}
