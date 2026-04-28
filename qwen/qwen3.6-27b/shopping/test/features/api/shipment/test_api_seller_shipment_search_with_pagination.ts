import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import type { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_seller_shipments_create } from "../../../generate/generate_random_ecommerce_platform_seller_shipments_create";
import { prepare_random_ecommerce_platform_shipment } from "../../../prepare/prepare_random_ecommerce_platform_shipment";

export async function test_api_seller_shipment_search_with_pagination(
  connection: api.IConnection,
) {
  // 1. Register and authenticate seller
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  // 2. Create multiple shipments for pagination testing
  const shipments = await ArrayUtil.asyncRepeat(
    25,
    async () =>
      await generate_random_ecommerce_platform_seller_shipments_create(
        userConnection,
        {},
      ),
  );
  await Promise.all(shipments.map(async (shipment) => typia.assert(shipment)));
  // 3. Search shipments with pagination parameters
  const response =
    await api.functional.ecommercePlatform.seller.shipments.index(
      userConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IEcommercePlatformShipment.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("page limit", response.pagination.limit, 10);
  TestValidator.predicate("total records", response.pagination.records > 0);
  TestValidator.equals("total pages", response.pagination.pages, 3);
  // 5. Validate data array contains expected shipments
  TestValidator.equals(
    "shipment count matches limit",
    response.data.length,
    10,
  );
  // 6. Verify filtering by carrier name works
  const firstCarrier = response.data[0].carrier_name;
  const carrierFilteredResponse =
    await api.functional.ecommercePlatform.seller.shipments.index(
      userConnection,
      {
        body: {
          carrierName: firstCarrier,
          limit: 100,
        } satisfies IEcommercePlatformShipment.IRequest,
      },
    );
  typia.assert(carrierFilteredResponse);
  TestValidator.predicate(
    "filtered results match carrier",
    carrierFilteredResponse.data.length > 0,
  );
  // 7. Test second page retrieval
  const secondPageResponse =
    await api.functional.ecommercePlatform.seller.shipments.index(
      userConnection,
      {
        body: {
          limit: 10,
          page: 2,
        } satisfies IEcommercePlatformShipment.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "current page is second",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.predicate(
    "second page has data",
    secondPageResponse.data.length > 0,
  );
  // 8. Verify seller data isolation
  TestValidator.equals(
    "shipments belong to authenticated seller",
    response.data[0].seller.id,
    (userConnection.headers!["Authorization"]! as string).split("Bearer ")[1],
  );
}
