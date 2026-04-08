import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
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

export async function test_api_cancellation_request_snapshot_immutable_history(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorization = await authorize_seller_join(sellerConnection, {
    body: {
      email:
        `seller_${RandomGenerator.alphabets(8)}@test.com` satisfies string &
          tags.Format<"email">,
      password: `Pw_${RandomGenerator.alphaNumeric(12)}` satisfies string &
        tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorization);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const first =
    await api.functional.mallPlatform.seller.orderItems.cancellationRequests.snapshots.at(
      sellerConnection,
      {
        orderItemId,
        cancellationRequestId,
        snapshotId,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.seller.orderItems.cancellationRequests.snapshots.at(
      sellerConnection,
      {
        orderItemId,
        cancellationRequestId,
        snapshotId,
      },
    );
  typia.assert(second);
  TestValidator.equals("snapshot id remains stable", first.id, second.id);
  TestValidator.equals(
    "cancellation request reference remains stable",
    first.cancellationRequest,
    second.cancellationRequest,
  );
  TestValidator.equals(
    "snapshot status remains stable",
    first.snapshotStatus,
    second.snapshotStatus,
  );
  TestValidator.equals(
    "review result remains stable",
    first.reviewResult,
    second.reviewResult,
  );
  TestValidator.equals("reason remains stable", first.reason, second.reason);
  TestValidator.equals(
    "changedAt remains stable",
    first.changedAt,
    second.changedAt,
  );
  TestValidator.equals(
    "createdAt remains stable",
    first.createdAt,
    second.createdAt,
  );
  TestValidator.equals(
    "updatedAt remains stable",
    first.updatedAt,
    second.updatedAt,
  );
  TestValidator.equals(
    "deletedAt remains stable",
    first.deletedAt,
    second.deletedAt,
  );
}
