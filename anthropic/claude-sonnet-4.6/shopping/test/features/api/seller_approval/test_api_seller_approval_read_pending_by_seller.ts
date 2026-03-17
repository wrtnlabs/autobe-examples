import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_seller_approval_read_pending_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller account using the utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  // Step 2: Submit a new seller approval request using the generation utility
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // Step 3: Retrieve the approval record by its ID
  const retrieved = await api.functional.shoppingMall.seller.approvals.at(
    sellerConnection,
    {
      approvalId: approval.id,
    },
  );
  typia.assert(retrieved);
  // Step 4: Validate the approval record content
  TestValidator.equals("approval id matches", retrieved.id, approval.id);
  TestValidator.equals(
    "approval status is pending",
    retrieved.status,
    "pending",
  );
  TestValidator.equals(
    "seller id matches",
    retrieved.seller.id,
    sellerAuthorized.id,
  );
  TestValidator.equals(
    "seller email matches",
    retrieved.seller.email,
    sellerAuthorized.email,
  );
  TestValidator.equals(
    "seller shopName matches",
    retrieved.seller.shopName,
    sellerAuthorized.shopName,
  );
  TestValidator.equals(
    "seller is not banned",
    retrieved.seller.isBanned,
    false,
  );
  TestValidator.equals(
    "seller is not suspended",
    retrieved.seller.isSuspended,
    false,
  );
  TestValidator.predicate(
    "submitted_at is not null",
    retrieved.submitted_at !== null,
  );
  TestValidator.equals("reviewed_at is null", retrieved.reviewed_at, null);
  TestValidator.equals(
    "rejection_reason is null",
    retrieved.rejection_reason,
    null,
  );
  TestValidator.equals("reviewed_by is null", retrieved.reviewed_by, null);
}
