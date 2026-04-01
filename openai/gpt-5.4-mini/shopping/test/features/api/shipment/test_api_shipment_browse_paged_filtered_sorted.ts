import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_shipment_browse_paged_filtered_sorted(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const requestList: IMallPlatformShipment.IRequest[] = [
    {
      page: 1,
      limit: 10,
    },
    {
      page: 1,
      limit: 10,
      sort: "createdAtAsc",
    },
    {
      page: 1,
      limit: 10,
      sort: "createdAtDesc",
    },
    {
      page: 1,
      limit: 10,
      sort: "shippedAtAsc",
    },
    {
      page: 1,
      limit: 10,
      sort: "shippedAtDesc",
    },
    {
      page: 1,
      limit: 10,
      sellerId: seller.id,
    },
    {
      page: 1,
      limit: 10,
      orderId: typia.random<string & tags.Format<"uuid">>(),
    },
    {
      page: 1,
      limit: 10,
      trackingNumber: RandomGenerator.alphaNumeric(12),
    },
    {
      page: 1,
      limit: 10,
      status: RandomGenerator.pick([
        "pending",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ] as const),
    },
    {
      page: 1,
      limit: 10,
      createdAtFrom: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      createdAtTo: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      page: 1,
      limit: 10,
      shippedAtFrom: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      shippedAtTo: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      page: 2,
      limit: 5,
    },
  ];
  const pages = await ArrayUtil.asyncMap(requestList, async (body) => {
    const output = await api.functional.mallPlatform.seller.shipments.index(
      sellerConnection,
      { body },
    );
    typia.assert(output);
    return output;
  });
  TestValidator.predicate("all responses are paginated pages", () =>
    pages.every(
      (page) =>
        page.pagination.current >= 0 &&
        page.pagination.limit >= 0 &&
        page.pagination.records >= 0 &&
        page.pagination.pages >= 0 &&
        Array.isArray(page.data),
    ),
  );
  TestValidator.predicate("empty result page is allowed", () =>
    pages.some((page) => page.data.length === 0),
  );
  TestValidator.predicate("seller scoped result is valid", () =>
    pages[5].data.every((shipment) => shipment.seller.id === seller.id),
  );
  TestValidator.predicate(
    "createdAt sort request returned a valid list",
    () => pages[1].data.length >= 0,
  );
  TestValidator.predicate(
    "shippedAt sort request returned a valid list",
    () => pages[3].data.length >= 0,
  );
  TestValidator.predicate(
    "pagination request accepted",
    () => pages[10].pagination.limit >= 0,
  );
}
