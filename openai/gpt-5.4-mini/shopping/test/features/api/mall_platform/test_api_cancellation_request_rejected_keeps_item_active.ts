import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_cancellation_request_rejected_keeps_item_active(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: "Password123!" satisfies string & tags.Format<"password">,
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = {
    ...(sellerConnection.headers ?? {}),
    Authorization: sellerAuth.token.access,
  };
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const reviewerNote = RandomGenerator.paragraph({ sentences: 2 });
  const output =
    await api.functional.mallPlatform.seller.orderItems.cancellationRequests.putByOrderitemidAndCancellationrequestid(
      sellerConnection,
      {
        orderItemId,
        cancellationRequestId,
        body: {
          reason,
          status: "rejected",
          reviewResult: "rejected",
          reviewerNote,
        } satisfies IMallPlatformCancellationRequest.IUpdate,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "cancellation request id",
    output.id,
    cancellationRequestId,
  );
  TestValidator.equals("cancellation request reason", output.reason, reason);
  TestValidator.equals(
    "cancellation request status",
    output.status,
    "rejected",
  );
  TestValidator.equals("review result", output.reviewResult, "rejected");
  TestValidator.equals("reviewer note", output.reviewerNote, reviewerNote);
  TestValidator.predicate(
    "reviewed timestamp exists",
    output.reviewedAt !== null,
  );
  TestValidator.equals(
    "linked order item id",
    output.orderItem.id,
    orderItemId,
  );
  TestValidator.predicate(
    "order item remains active",
    output.orderItem.deleted_at === null,
  );
  TestValidator.predicate(
    "order item is not cancelled",
    output.orderItem.status !== "cancelled",
  );
  TestValidator.predicate(
    "order item is not refunded",
    output.orderItem.status !== "refunded",
  );
}
