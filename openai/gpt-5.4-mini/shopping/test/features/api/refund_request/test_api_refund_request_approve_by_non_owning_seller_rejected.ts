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

export async function test_api_refund_request_approve_by_non_owning_seller_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const owner = await authorize_seller_join(ownerConnection, {
    body: {
      email: ownerEmail satisfies string,
      password: "password1234",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(owner);
  const nonOwningSellerConnection: api.IConnection = { host: connection.host };
  const nonOwningSellerEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const nonOwningSeller = await authorize_seller_join(
    nonOwningSellerConnection,
    {
      body: {
        email: nonOwningSellerEmail satisfies string,
        password: "password1234",
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: null,
      } satisfies IMallPlatformSeller.IJoin,
    },
  );
  typia.assert(nonOwningSeller);
  await TestValidator.httpError(
    "non-owning seller cannot approve refund request",
    [400, 403, 404],
    async () => {
      await api.functional.mallPlatform.seller.refundRequests.approve.create(
        nonOwningSellerConnection,
        {
          refundRequestId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
