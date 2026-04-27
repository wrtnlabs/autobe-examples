import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_requests_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Filter by "approved" status
  const approvedPage =
    await api.functional.eCommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: ["approved"],
          page: 1,
          limit: 10,
        } satisfies IECommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedPage);
  TestValidator.predicate(
    "approved page has pagination metadata",
    approvedPage.pagination !== null,
  );
  for (const item of approvedPage.data) {
    TestValidator.equals("approved item status", item.status, "approved");
  }
  // 3. Filter by "rejected" status
  const rejectedPage =
    await api.functional.eCommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: ["rejected"],
          page: 1,
          limit: 10,
        } satisfies IECommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedPage);
  TestValidator.predicate(
    "rejected page has pagination metadata",
    rejectedPage.pagination !== null,
  );
  for (const item of rejectedPage.data) {
    TestValidator.equals("rejected item status", item.status, "rejected");
  }
  // 4. Filter by "pending" status
  const pendingPage =
    await api.functional.eCommerceMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: ["pending"],
          page: 1,
          limit: 10,
        } satisfies IECommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingPage);
  TestValidator.predicate(
    "pending page has pagination metadata",
    pendingPage.pagination !== null,
  );
  for (const item of pendingPage.data) {
    TestValidator.equals("pending item status", item.status, "pending");
  }
}
