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
 * Test seller retrieving their own approval request snapshot.
 *
 * This test validates the complete workflow of seller approval request snapshot retrieval:
 * 1. Register a new seller account
 * 2. Submit a seller approval request
 * 3. Retrieve the snapshot of the approval request
 * 4. Verify snapshot data integrity and authorization
 */
export async function test_api_seller_approval_snapshot_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Submit a seller approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(approvalRequest);
  // 3. Use the request ID as the snapshot ID (assuming first snapshot has same ID)
  const requestId = approvalRequest.id;
  const snapshotId = requestId;
  // 4. Retrieve the snapshot
  const snapshot =
    await api.functional.shoppingMall.seller.seller_approval_requests.snapshots.at(
      sellerConnection,
      {
        requestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 5. Verify snapshot structure and data
  TestValidator.equals("snapshot id matches", snapshot.id, snapshotId);
  TestValidator.equals(
    "request id matches",
    snapshot.sellerApprovalRequest.id,
    requestId,
  );
  TestValidator.equals(
    "seller id matches",
    snapshot.sellerApprovalRequest.seller.id,
    sellerAuth.id,
  );
  TestValidator.predicate("snapshot data is valid JSON", () => {
    try {
      JSON.parse(snapshot.snapshotData);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.createdAt != null,
  );
  TestValidator.predicate(
    "seller email matches",
    snapshot.sellerApprovalRequest.seller.email === sellerAuth.email,
  );
  TestValidator.equals(
    "approval reason preserved",
    snapshot.sellerApprovalRequest.reason,
    approvalRequest.reason,
  );
}
