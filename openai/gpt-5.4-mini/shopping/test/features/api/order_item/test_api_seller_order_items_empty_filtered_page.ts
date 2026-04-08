import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
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

export async function test_api_seller_order_items_empty_filtered_page(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const createdAtFrom = new Date(
    "2100-01-01T00:00:00.000Z",
  ).toISOString() as string & tags.Format<"date-time">;
  const createdAtTo = new Date(
    "2100-01-02T00:00:00.000Z",
  ).toISOString() as string & tags.Format<"date-time">;
  const request = {
    mallPlatformOrderId: typia.random<string & tags.Format<"uuid">>(),
    mallPlatformProductVariantId: typia.random<string & tags.Format<"uuid">>(),
    mallPlatformSellerId: typia.random<string & tags.Format<"uuid">>(),
    status: "paid",
    createdAtFrom,
    createdAtTo,
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IMallPlatformOrderItem.IRequest;
  const output = await api.functional.mallPlatform.seller.orderItems.index(
    sellerConnection,
    {
      body: request,
    },
  );
  typia.assert(output);
  TestValidator.equals("empty order item page data", output.data.length, 0);
  TestValidator.equals("zero matching records", output.pagination.records, 0);
  TestValidator.equals("zero pagination pages", output.pagination.pages, 0);
  TestValidator.equals(
    "current page is first page",
    output.pagination.current,
    1,
  );
  TestValidator.equals("page size is preserved", output.pagination.limit, 10);
}
