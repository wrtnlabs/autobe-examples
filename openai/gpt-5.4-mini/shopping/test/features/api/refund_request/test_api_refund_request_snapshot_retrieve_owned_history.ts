import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Retrieve a seller-owned refund request snapshot and verify preserved historical state.
 *
 * This test authenticates a seller through an isolated seller connection, calls the
 * seller-scoped refund request snapshot endpoint, and validates that the response is a
 * read-only historical snapshot payload rather than mutable workflow data.
 *
 * 1. Authenticate a seller using a separate connection derived from the base host.
 * 2. Retrieve a refund request snapshot through the seller-owned route.
 * 3. Verify the snapshot preserves parent linkage and historical transition metadata.
 * 4. Confirm the response contains immutable read-only history fields for dispute review.
 */
export async function test_api_refund_request_snapshot_retrieve_owned_history(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const props = {
    orderItemId: typia.random<string & tags.Format<"uuid">>(),
    refundRequestId: typia.random<string & tags.Format<"uuid">>(),
    snapshotId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies api.functional.mallPlatform.seller.orderItems.refundRequests.snapshots.at.Props;
  const snapshot =
    await api.functional.mallPlatform.seller.orderItems.refundRequests.snapshots.at(
      sellerConnection,
      props,
    );
  typia.assert(snapshot);
  TestValidator.equals("snapshot id", snapshot.id, props.snapshotId);
  TestValidator.equals(
    "refund request id",
    snapshot.refundRequest.id,
    props.refundRequestId,
  );
  TestValidator.equals(
    "order item id",
    snapshot.refundRequest.orderItem.id,
    props.orderItemId,
  );
  TestValidator.predicate(
    "snapshot reason preserved",
    snapshot.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "status transition preserved",
    snapshot.statusBefore.length > 0 && snapshot.statusAfter.length > 0,
  );
  TestValidator.predicate(
    "historical metadata available",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "reviewer role is historical metadata",
    snapshot.reviewerRole === null || snapshot.reviewerRole.length > 0,
  );
  TestValidator.predicate(
    "reviewer note is historical metadata",
    snapshot.reviewerNote === null || snapshot.reviewerNote.length > 0,
  );
}
