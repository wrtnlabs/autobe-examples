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

/**
 * Verifies empty-state behavior for seller shipment eligibility browsing.
 *
 * This test ensures that a newly registered seller with no shippable order items receives a valid empty paginated page from the shipment eligibility endpoint instead of an error.
 * It focuses on the zero-record case, pagination metadata consistency, and the usability of the shipment creation screen when there is nothing eligible to ship.
 *
 * 1. Register and authenticate a seller account with the seller join utility.
 * 2. Query eligible order items for shipment creation using the authenticated seller connection.
 * 3. Validate that the response contains no records and that pagination metadata reflects the empty page.
 */
export async function test_api_shipment_eligible_order_items_empty_state(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` as string,
      password: `Password${RandomGenerator.alphaNumeric(8)}!` as string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const response =
    await api.functional.mallPlatform.seller.shipments.eligible_order_items.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformOrderItem.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "eligible order items should be empty",
    response.data,
    [],
  );
  TestValidator.equals(
    "pagination records should be zero",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be zero",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current should be one",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    response.pagination.limit,
    10,
  );
}
