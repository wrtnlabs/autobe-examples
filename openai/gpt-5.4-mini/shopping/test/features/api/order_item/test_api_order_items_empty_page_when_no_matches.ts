import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_items_empty_page_when_no_matches(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: RandomGenerator.alphabets(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  const noMatchByFilter =
    await api.functional.mallPlatform.seller.orderItems.index(
      sellerConnection,
      {
        body: {
          mallPlatformSellerId: typia.random<string & tags.Format<"uuid">>(),
          mallPlatformOrderId: typia.random<string & tags.Format<"uuid">>(),
          mallPlatformProductVariantId: typia.random<
            string & tags.Format<"uuid">
          >(),
          status: `status-${RandomGenerator.alphabets(8)}`,
          page: 1,
          limit: 10,
          sort: "createdAt",
          direction: "desc",
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(noMatchByFilter);
  TestValidator.equals(
    "no-match filter should return empty data",
    noMatchByFilter.data,
    [],
  );
  TestValidator.equals(
    "no-match filter should report zero records",
    noMatchByFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "no-match filter should report zero pages",
    noMatchByFilter.pagination.pages,
    0,
  );
  TestValidator.equals(
    "no-match filter should keep current page at requested value",
    noMatchByFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "no-match filter should keep requested limit",
    noMatchByFilter.pagination.limit,
    10,
  );
  const beyondRange = await api.functional.mallPlatform.seller.orderItems.index(
    sellerConnection,
    {
      body: {
        page: 999999,
        limit: 10,
        sort: "createdAt",
        direction: "desc",
      } satisfies IMallPlatformOrderItem.IRequest,
    },
  );
  typia.assert(beyondRange);
  TestValidator.equals(
    "out-of-range page should return empty data",
    beyondRange.data,
    [],
  );
  TestValidator.equals(
    "out-of-range page should report zero records when nothing matches",
    beyondRange.pagination.records,
    0,
  );
  TestValidator.equals(
    "out-of-range page should report zero pages when nothing matches",
    beyondRange.pagination.pages,
    0,
  );
  TestValidator.equals(
    "out-of-range page should preserve requested current page",
    beyondRange.pagination.current,
    999999,
  );
  TestValidator.equals(
    "out-of-range page should preserve requested limit",
    beyondRange.pagination.limit,
    10,
  );
}
