import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_refund_request_snapshot_parent_mismatch_not_found(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const otherRefundRequestId = typia.random<string & tags.Format<"uuid">>();
  const otherSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "mismatched refund request snapshot should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.refundRequests.snapshots.at(
        sellerConnection,
        {
          refundRequestId,
          snapshotId: otherSnapshotId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "missing refund request snapshot should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.refundRequests.snapshots.at(
        sellerConnection,
        {
          refundRequestId: otherRefundRequestId,
          snapshotId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "missing parent and snapshot pair should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.seller.refundRequests.snapshots.at(
        sellerConnection,
        {
          refundRequestId,
          snapshotId,
        },
      );
    },
  );
}
