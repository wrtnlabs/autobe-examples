import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refund_request_search_by_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Search refund requests by reason keyword (expect empty results initially)
  const searchKeyword = RandomGenerator.paragraph({ sentences: 1 });
  const page = await api.functional.eCommerceMall.seller.refund_requests.index(
    sellerConnection,
    {
      body: {
        search: searchKeyword,
        page: 1,
        limit: 10,
      } satisfies IECommerceMallRefundRequest.IRequest,
    },
  );
  typia.assert(page);
  // 3. Validate empty results pagination
  TestValidator.equals(
    "empty search results records count",
    page.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search results pages count",
    page.pagination.pages,
    0,
  );
  TestValidator.equals("empty search results data array", page.data.length, 0);
  // 4. Search with combined filters (keyword + status)
  const combinedPage =
    await api.functional.eCommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          search: searchKeyword,
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(combinedPage);
  // 5. Validate combined filter pagination
  TestValidator.equals(
    "combined filter records count",
    combinedPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filter pages count",
    combinedPage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "combined filter data array",
    combinedPage.data.length,
    0,
  );
  // 6. Search without filters (should still return valid pagination)
  const allPage =
    await api.functional.eCommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {} satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(allPage);
}
