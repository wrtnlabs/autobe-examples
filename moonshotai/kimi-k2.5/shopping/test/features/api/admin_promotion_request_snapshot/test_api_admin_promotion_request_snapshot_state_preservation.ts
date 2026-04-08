import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test scenario: Verify snapshots accurately preserve request state across the request lifecycle.
 *
 * This test validates that:
 * 1. Snapshots capture the complete state at a specific moment in time
 * 2. Snapshot data is immutable and preserves historical state
 * 3. Audit trail is maintained for compliance and dispute resolution
 */
export async function test_api_admin_promotion_request_snapshot_state_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin for managing snapshots
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create seller who will submit the promotion request
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Seller creates admin promotion request in PENDING state
  const promotionRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 3,
            wordMin: 10,
            wordMax: 15,
          }),
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  TestValidator.equals(
    "promotion request initial status",
    promotionRequest.status,
    "pending",
  );
  // 4. List snapshots to obtain a valid snapshotId (filtering by requestId is implicit via path)
  const snapshotList =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.snapshots.index(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotList);
  // Validate that there are snapshots to test with
  TestValidator.predicate(
    "snapshots exist for request",
    () => snapshotList.data.length > 0,
  );
  TestValidator.predicate(
    "pagination data present",
    () => snapshotList.pagination.records >= 0,
  );
  // Get first available snapshot for state preservation validation
  const firstSnapshotSummary = snapshotList.data[0];
  typia.assert(firstSnapshotSummary);
  // 5. Retrieve specific snapshot by ID to verify state preservation
  const snapshot =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.snapshots.at(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        snapshotId: firstSnapshotSummary.id,
      },
    );
  typia.assert(snapshot);
  // Validate state preservation in the snapshot
  TestValidator.equals(
    "snapshot belongs to correct request",
    snapshot.adminPromotionRequestId,
    promotionRequest.id,
  );
  TestValidator.equals(
    "snapshot request reference matches",
    snapshot.adminPromotionRequest.id,
    promotionRequest.id,
  );
  // Validate audit trail integrity - snapshot captures transition from previous to current state
  TestValidator.predicate(
    "state transition captured",
    () => snapshot.previousStatus !== snapshot.adminPromotionRequest.status,
  );
  // Validate immutability - snapshot IDs must match between list and detail views
  TestValidator.equals(
    "snapshot ID consistency",
    snapshot.id,
    firstSnapshotSummary.id,
  );
}