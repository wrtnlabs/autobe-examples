import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_seller_approval_requests_create } from "../../../generate/generate_random_mall_platform_seller_seller_approval_requests_create";
import { prepare_random_mall_platform_seller_approval_request } from "../../../prepare/prepare_random_mall_platform_seller_approval_request";

export async function test_api_seller_approval_request_resubmit_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(
    16,
  ) satisfies string as string;
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller/join",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(adminJoin);
  const firstRequest =
    await generate_random_mall_platform_seller_seller_approval_requests_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(firstRequest);
  const rejectedRequest =
    await api.functional.mallPlatform.administrator.seller_approval_requests.reject(
      adminConnection,
      {
        sellerApprovalRequestId: firstRequest.id,
        body: {
          rejectionReason: null,
        } satisfies IMallPlatformSellerApprovalRequest.IReject,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "rejected request should match the first request",
    rejectedRequest.id,
    firstRequest.id,
  );
  TestValidator.equals(
    "rejected request should belong to the same seller",
    rejectedRequest.seller.id,
    sellerJoin.id,
  );
  TestValidator.equals(
    "rejected request status should be rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejected request rejection reason should be null in DTO",
    rejectedRequest.rejectionReason,
    null,
  );
  const secondRequest =
    await generate_random_mall_platform_seller_seller_approval_requests_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(secondRequest);
  TestValidator.notEquals(
    "resubmitted request should create a new approval request record",
    secondRequest.id,
    firstRequest.id,
  );
  TestValidator.equals(
    "resubmitted request should belong to the same seller",
    secondRequest.seller.id,
    sellerJoin.id,
  );
  TestValidator.equals(
    "resubmitted request should be pending",
    secondRequest.status,
    "pending",
  );
  TestValidator.equals(
    "resubmitted request should not have a rejection reason",
    secondRequest.rejectionReason,
    null,
  );
}
