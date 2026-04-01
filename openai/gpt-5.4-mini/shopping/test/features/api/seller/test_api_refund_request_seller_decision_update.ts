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

export async function test_api_refund_request_seller_decision_update(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const reviewedAt = new Date().toISOString();
  const reviewNote = RandomGenerator.paragraph({ sentences: 3 });
  const status = RandomGenerator.pick(["approved", "rejected"] as const);
  const updated =
    await api.functional.mallPlatform.seller.refundRequests.update(
      sellerConnection,
      {
        refundRequestId,
        body: {
          status,
          reviewedAt,
          reviewNote,
        } satisfies IMallPlatformRefundRequest.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "response status should match requested decision",
    updated.status,
    status,
  );
  TestValidator.equals(
    "response reviewedAt should match request",
    updated.reviewedAt,
    reviewedAt,
  );
  TestValidator.equals(
    "response review note should match request",
    updated.reviewNote,
    reviewNote,
  );
  TestValidator.predicate(
    "refund request should keep linked entities in the response",
    updated.orderItem !== null &&
      updated.customer !== null &&
      updated.seller !== null,
  );
  TestValidator.predicate(
    "administrator reviewer should be nullable and only present when applicable",
    updated.administrator === null || typeof updated.administrator === "object",
  );
}
