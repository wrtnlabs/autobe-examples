import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_orders_shipments_multi_status(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Authenticate as a seller
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // We cannot create actual shipments since no creation API exists
  // Instead, we'll test the filtering functionality with various status parameters
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // Test filtering by individual status values: 'created', 'shipped', 'delivered'
  const statuses = ["created", "shipped", "delivered"] as const;
  for (const status of statuses) {
    const request = {
      shipment_status: status,
      page: 1 satisfies number as number,
      limit: 10 satisfies number as number,
    } satisfies IEcommerceShipment.IRequest;
    const response =
      await api.functional.ecommerce.seller.orders.shipments.index(
        sellerConnection,
        {
          orderId,
          body: request,
        },
      );
    typia.assert(response);
    // Validate pagination structure
    TestValidator.equals(
      "pagination exists",
      typeof response.pagination,
      "object",
    );
    TestValidator.predicate(
      "has current page",
      response.pagination.current >= 0,
    );
    TestValidator.predicate("has limit", response.pagination.limit >= 0);
    TestValidator.predicate(
      "has records count",
      response.pagination.records >= 0,
    );
    TestValidator.predicate("has pages count", response.pagination.pages >= 0);
    // Validate data array exists
    TestValidator.equals("data is array", Array.isArray(response.data), true);
  }
  // Test combined filtering with date ranges
  const now = new Date().toISOString();
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateRangeRequest = {
    shipment_status: "created",
    created_at_min: pastDate satisfies string as string,
    created_at_max: now satisfies string as string,
    page: 1 satisfies number as number,
    limit: 5 satisfies number as number,
  } satisfies IEcommerceShipment.IRequest;
  const dateRangeResponse =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: dateRangeRequest,
      },
    );
  typia.assert(dateRangeResponse);
}
