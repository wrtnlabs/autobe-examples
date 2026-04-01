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

export async function test_api_shipment_browse_seller_scope_isolated(
  connection: api.IConnection,
): Promise<void> {
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email:
        `seller1_${RandomGenerator.alphaNumeric(10)}@example.com` satisfies string,
      password: `Password_${RandomGenerator.alphaNumeric(12)}` satisfies string,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller1);
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email:
        `seller2_${RandomGenerator.alphaNumeric(10)}@example.com` satisfies string,
      password: `Password_${RandomGenerator.alphaNumeric(12)}` satisfies string,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller2);
  const sellerPage = await api.functional.mallPlatform.seller.shipments.index(
    seller1Connection,
    {
      body: {
        sellerId: seller1.id,
        page: 1,
        limit: 20,
        sort: "createdAtDesc",
      } satisfies IMallPlatformShipment.IRequest,
    },
  );
  typia.assert(sellerPage);
  TestValidator.predicate(
    "seller shipment page is paginated",
    sellerPage.pagination.current >= 1 &&
      sellerPage.pagination.limit >= 0 &&
      sellerPage.pagination.records >= 0 &&
      sellerPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned shipments belong to the authenticated seller",
    sellerPage.data.every((shipment) => shipment.seller.id === seller1.id),
  );
  const crossSellerScopedPage =
    await api.functional.mallPlatform.seller.shipments.index(
      seller1Connection,
      {
        body: {
          sellerId: seller2.id,
          page: 1,
          limit: 20,
          sort: "createdAtDesc",
        } satisfies IMallPlatformShipment.IRequest,
      },
    );
  typia.assert(crossSellerScopedPage);
  TestValidator.predicate(
    "cross-seller filtering does not reveal another seller's shipments",
    crossSellerScopedPage.data.every(
      (shipment) => shipment.seller.id === seller1.id,
    ),
  );
  const completedScopePage =
    await api.functional.mallPlatform.seller.shipments.index(
      seller1Connection,
      {
        body: {
          sellerId: seller1.id,
          status: "delivered",
          page: 1,
          limit: 20,
          sort: "shippedAtDesc",
        } satisfies IMallPlatformShipment.IRequest,
      },
    );
  typia.assert(completedScopePage);
  TestValidator.predicate(
    "completed shipments remain listable for the authenticated seller",
    completedScopePage.data.every(
      (shipment) => shipment.seller.id === seller1.id,
    ),
  );
}
