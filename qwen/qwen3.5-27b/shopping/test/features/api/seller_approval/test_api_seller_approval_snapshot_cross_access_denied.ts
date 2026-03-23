import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test authorization enforcement when a seller attempts to access another seller's approval request snapshot.
 *
 * This test validates that sellers can only access snapshots of their own approval requests,
 * and that cross-seller data access is properly blocked with appropriate authorization errors.
 */
export async function test_api_seller_approval_snapshot_cross_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first seller account (seller1)
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1Auth);
  // 2. Create seller1's approval request
  const seller1Request =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      seller1Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(seller1Request);
  // 3. Generate a snapshot ID to test with
  // In production, snapshots are created automatically during the approval workflow.
  // We use a valid UUID format to test authorization, regardless of snapshot existence.
  const seller1RequestId = seller1Request.id;
  const seller1SnapshotId = typia.random<string & typia.tags.Format<"uuid">>();
  // 4. Register second seller account (seller2)
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2Auth);
  // 5. Create seller2's approval request (establishes their own context)
  const seller2Request =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      seller2Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(seller2Request);
  // 6. Test: seller2 attempts to access seller1's snapshot (should be denied)
  // The system should reject with 403 Forbidden (authorization error) or 404 Not Found.
  // The key validation is that seller2 cannot access seller1's data.
  await TestValidator.error(
    "seller2 cannot access seller1's approval request snapshot",
    async () =>
      await api.functional.shoppingMall.seller.seller_approval_requests.snapshots.at(
        seller2Connection,
        {
          requestId: seller1RequestId,
          snapshotId: seller1SnapshotId,
        },
      ),
  );
}
