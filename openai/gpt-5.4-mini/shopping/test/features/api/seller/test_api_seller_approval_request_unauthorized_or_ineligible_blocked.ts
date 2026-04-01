import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_seller_approval_requests_create } from "../../../generate/generate_random_mall_platform_seller_seller_approval_requests_create";
import { prepare_random_mall_platform_seller_approval_request } from "../../../prepare/prepare_random_mall_platform_seller_approval_request";

export async function test_api_seller_approval_request_unauthorized_or_ineligible_blocked(
  connection: api.IConnection,
): Promise<void> {
  await TestValidator.httpError(
    "unauthenticated seller approval request should be rejected",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.seller.seller_approval_requests.create(
        connection,
        {
          body: {} satisfies IMallPlatformSellerApprovalRequest.ICreate,
        },
      );
    },
  );
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  await TestValidator.httpError(
    "ineligible seller approval request submission should be rejected",
    [400, 403, 409],
    async () => {
      await generate_random_mall_platform_seller_seller_approval_requests_create(
        sellerConnection,
        { body: {} },
      );
    },
  );
}
