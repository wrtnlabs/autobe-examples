import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_cancellation_request_snapshot_history_browse(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` satisfies string,
      password: "1234" satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  sellerConnection.headers = {
    ...(sellerConnection.headers ?? {}),
    Authorization: authorized.token.access,
  };
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const request: IMallPlatformCancellationRequestSnapshot.IRequest = {
    page: 1,
    limit: 10,
  };
  const output =
    await api.functional.mallPlatform.seller.orderItems.cancellationRequests.snapshots.index(
      sellerConnection,
      {
        orderItemId,
        cancellationRequestId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals(
    "pagination limit",
    output.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed page limit",
    output.data.length <= output.pagination.limit,
  );
  if (output.data.length > 0) {
    const first = output.data[0];
    TestValidator.predicate("snapshot has id", first.id.length > 0);
    TestValidator.predicate(
      "snapshot has cancellation request relation",
      !!first.cancellationRequest,
    );
    TestValidator.predicate(
      "snapshot has status",
      first.snapshotStatus.length > 0,
    );
    TestValidator.predicate(
      "snapshot review result is nullable string",
      first.reviewResult === null || typeof first.reviewResult === "string",
    );
    TestValidator.predicate(
      "snapshot reason is nullable string",
      first.reason === null || typeof first.reason === "string",
    );
    TestValidator.predicate(
      "snapshot has changedAt",
      first.changedAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot has createdAt",
      first.createdAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot has updatedAt",
      first.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot timestamps are preserved as ISO strings",
      first.changedAt <= first.createdAt && first.createdAt <= first.updatedAt,
    );
  }
}
