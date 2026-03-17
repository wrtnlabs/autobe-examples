import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApproval";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_seller_approvals_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller account and get an authenticated connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Step 2: Submit a seller approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  // Step 3: Filter by 'pending' status
  const pendingResult =
    await api.functional.shoppingMall.seller.approvals.index(sellerConnection, {
      body: {
        status: "pending",
      } satisfies IShoppingMallSellerApproval.IRequest,
    });
  typia.assert(pendingResult);
  // Step 4: Verify all returned records have 'pending' status
  TestValidator.predicate("all pending records have pending status", () =>
    pendingResult.data.every((item) => item.status === "pending"),
  );
  // Step 5: Verify pagination metadata is present and data count is consistent
  TestValidator.predicate(
    "pending records count is at least 1",
    () => pendingResult.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pending pages count is at least 1",
    () => pendingResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pending data array length does not exceed page limit",
    () => pendingResult.data.length <= pendingResult.pagination.limit,
  );
  // Step 6: Filter by 'approved' status — should return empty since no approvals made
  const approvedResult =
    await api.functional.shoppingMall.seller.approvals.index(sellerConnection, {
      body: {
        status: "approved",
      } satisfies IShoppingMallSellerApproval.IRequest,
    });
  typia.assert(approvedResult);
  // Step 7: Verify empty result for 'approved'
  TestValidator.equals(
    "approved data array is empty",
    approvedResult.data.length,
    0,
  );
  TestValidator.equals(
    "approved records count is 0",
    approvedResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "approved pages count is 0",
    approvedResult.pagination.pages,
    0,
  );
  // Step 8: Filter by 'rejected' status — should return empty since no rejections made
  const rejectedResult =
    await api.functional.shoppingMall.seller.approvals.index(sellerConnection, {
      body: {
        status: "rejected",
      } satisfies IShoppingMallSellerApproval.IRequest,
    });
  typia.assert(rejectedResult);
  // Step 9: Verify empty result for 'rejected'
  TestValidator.equals(
    "rejected data array is empty",
    rejectedResult.data.length,
    0,
  );
  TestValidator.equals(
    "rejected records count is 0",
    rejectedResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "rejected pages count is 0",
    rejectedResult.pagination.pages,
    0,
  );
}
