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

export async function test_api_refund_request_disallowed_transition_protection(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_seller_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
      password: `P@ssw0rd!${RandomGenerator.alphaNumeric(6)}`,
      href: "https://example.com/seller/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(ownerAuth);
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruderAuth = await authorize_seller_join(intruderConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}-intruder@test.com`,
      password: `P@ssw0rd!${RandomGenerator.alphaNumeric(6)}`,
      href: "https://example.com/seller/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(intruderAuth);
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const invalidTransitionBody = {
    status: "approved",
    reviewedAt: new Date().toISOString(),
    reviewNote: "transition protection test",
  } satisfies IMallPlatformRefundRequest.IUpdate;
  await TestValidator.error(
    "owner cannot update refund request with disallowed transition or invalid request state",
    async () => {
      await api.functional.mallPlatform.seller.refundRequests.update(
        ownerConnection,
        {
          refundRequestId,
          body: invalidTransitionBody,
        },
      );
    },
  );
  await TestValidator.error(
    "non-owning seller cannot update refund request",
    async () => {
      await api.functional.mallPlatform.seller.refundRequests.update(
        intruderConnection,
        {
          refundRequestId,
          body: invalidTransitionBody,
        },
      );
    },
  );
}
