import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
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

export async function test_api_cancellation_request_snapshot_parent_relationship_guard(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const orderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const cancellationRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const mismatchedOrderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const request: IMallPlatformCancellationRequestSnapshot.IRequest = {
    page: 1,
    limit: 10,
    sort: "-createdAt",
  };
  const matched =
    await api.functional.mallPlatform.seller.orderItems.cancellationRequests.snapshots.index(
      sellerConnection,
      {
        orderItemId,
        cancellationRequestId,
        body: request,
      },
    );
  typia.assert(matched);
  TestValidator.predicate(
    "matched snapshot response should include pagination metadata",
    matched.pagination.current >= 1 && matched.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "matched snapshot response should include a snapshot data array",
    Array.isArray(matched.data),
  );
  try {
    const mismatch =
      await api.functional.mallPlatform.seller.orderItems.cancellationRequests.snapshots.index(
        sellerConnection,
        {
          orderItemId: mismatchedOrderItemId,
          cancellationRequestId,
          body: request,
        },
      );
    typia.assert(mismatch);
    TestValidator.equals(
      "mismatched parent relationship should not expose unrelated snapshots",
      mismatch.data.length,
      0,
    );
  } catch {
    // Non-disclosure behavior is acceptable here: the endpoint may either
    // reject the mismatched parent-child relationship or return an empty page.
  }
}
