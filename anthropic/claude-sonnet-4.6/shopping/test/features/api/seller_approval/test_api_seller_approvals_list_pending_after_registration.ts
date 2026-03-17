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

export async function test_api_seller_approvals_list_pending_after_registration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller account (auto-creates a pending approval record)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const shopName = RandomGenerator.name();
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      shop_name: shopName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Step 2: List seller approvals with default (empty) request body
  const result = await api.functional.shoppingMall.seller.approvals.index(
    sellerConnection,
    {
      body: {} satisfies IShoppingMallSellerApproval.IRequest,
    },
  );
  typia.assert(result);
  // Step 3: Validate pagination metadata
  TestValidator.predicate("records >= 1", result.pagination.records >= 1);
  TestValidator.predicate("pages >= 1", result.pagination.pages >= 1);
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 20 (default)", result.pagination.limit, 20);
  // Step 4: Validate that at least one pending approval record exists
  TestValidator.predicate(
    "at least one approval record in data",
    result.data.length >= 1,
  );
  const pendingRecord = result.data.find((r) => r.status === "pending");
  TestValidator.predicate(
    "pending approval record exists",
    pendingRecord !== undefined,
  );
  // Step 5: Validate the pending record details match the registered seller
  if (pendingRecord !== undefined) {
    TestValidator.equals(
      "seller email matches registered email",
      pendingRecord.seller.email,
      sellerEmail,
    );
    TestValidator.equals(
      "seller shopName matches registered shop name",
      pendingRecord.seller.shopName,
      shopName,
    );
    // reviewedAt and rejectionReason must be null for pending records
    TestValidator.equals(
      "reviewedAt is null for pending record",
      pendingRecord.reviewedAt,
      null,
    );
    TestValidator.equals(
      "rejectionReason is null for pending record",
      pendingRecord.rejectionReason,
      null,
    );
    // isBanned and isSuspended should be false for a newly registered seller
    TestValidator.equals(
      "seller is not banned",
      pendingRecord.seller.isBanned,
      false,
    );
    TestValidator.equals(
      "seller is not suspended",
      pendingRecord.seller.isSuspended,
      false,
    );
  }
}
