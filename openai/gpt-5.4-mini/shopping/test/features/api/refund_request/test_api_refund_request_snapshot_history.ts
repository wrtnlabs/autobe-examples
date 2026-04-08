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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_refund_request_snapshot_history(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "Aa1!",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(auth);
  const request: IMallPlatformRefundRequestSnapshot.IRequest = {
    page: 1,
    limit: 10,
    sort: "-created_at",
  };
  const response =
    await api.functional.mallPlatform.seller.orderItems.refundRequests.snapshots.index(
      sellerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        refundRequestId: typia.random<string & tags.Format<"uuid">>(),
        body: request,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit",
    response.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot history is returned as an array",
    Array.isArray(response.data),
  );
  if (response.data.length > 0) {
    const first = response.data[0];
    TestValidator.predicate(
      "snapshot references its parent refund request",
      first.refundRequest.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot includes snapshot reason",
      first.snapshot_reason.length > 0,
    );
    TestValidator.predicate(
      "snapshot includes status_before",
      first.status_before.length > 0,
    );
    TestValidator.predicate(
      "snapshot includes status_after",
      first.status_after.length > 0,
    );
    TestValidator.predicate(
      "snapshot exposes reviewer role",
      first.reviewer_role === null || first.reviewer_role.length > 0,
    );
    TestValidator.predicate(
      "snapshot exposes reviewer note",
      first.reviewer_note === null || first.reviewer_note.length > 0,
    );
    TestValidator.predicate(
      "snapshot includes created_at timestamp",
      first.created_at.length > 0,
    );
  }
  if (response.data.length > 1) {
    TestValidator.predicate(
      "snapshots are ordered newest first by default",
      response.data[0].created_at >= response.data[1].created_at,
    );
  }
}
