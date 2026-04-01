import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
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

export async function test_api_refund_request_rejection_preserves_item_state(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const reviewedAt = new Date().toISOString();
  const reviewNote = RandomGenerator.paragraph({ sentences: 2 });
  const output = await api.functional.mallPlatform.seller.refundRequests.update(
    sellerConnection,
    {
      refundRequestId,
      body: {
        status: "rejected",
        reviewedAt,
        reviewNote,
      } satisfies IMallPlatformRefundRequest.IUpdate,
    },
  );
  typia.assert(output);
  TestValidator.equals("refund request id matches", output.id, refundRequestId);
  TestValidator.equals(
    "refund request status rejected",
    output.status,
    "rejected",
  );
  TestValidator.equals(
    "reviewed timestamp preserved",
    output.reviewedAt,
    reviewedAt,
  );
  TestValidator.equals("review note preserved", output.reviewNote, reviewNote);
  TestValidator.predicate(
    "refund request has an order item",
    output.orderItem !== null && output.orderItem !== undefined,
  );
  TestValidator.predicate(
    "refund request has a seller",
    output.seller !== null && output.seller !== undefined,
  );
  TestValidator.predicate(
    "refund request has a customer",
    output.customer !== null && output.customer !== undefined,
  );
  TestValidator.predicate(
    "seller decision does not assign administrator",
    output.administrator === null,
  );
}
