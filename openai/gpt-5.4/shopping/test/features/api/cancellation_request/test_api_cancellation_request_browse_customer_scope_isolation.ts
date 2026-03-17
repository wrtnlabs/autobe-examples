import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddressSnapshot";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import type { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_request_browse_customer_scope_isolation(
  connection: api.IConnection,
): Promise<void> {
  const customerOneConnection: api.IConnection = { host: connection.host };
  const customerOne: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerOneConnection, {
      body: {},
    });
  typia.assert(customerOne);
  const customerOneRequest: IShoppingMallCancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerOneConnection,
      {
        body: {
          reason: `scope-own-${RandomGenerator.alphaNumeric(8)}`,
        },
      },
    );
  typia.assert(customerOneRequest);
  const customerTwoConnection: api.IConnection = { host: connection.host };
  const customerTwo: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerTwoConnection, {
      body: {},
    });
  typia.assert(customerTwo);
  const customerTwoRequest: IShoppingMallCancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerTwoConnection,
      {
        body: {
          reason: `scope-other-${RandomGenerator.alphaNumeric(8)}`,
        },
      },
    );
  typia.assert(customerTwoRequest);
  const browseInput = {
    shoppingMallCustomerId: customerTwo.id,
    shoppingMallOrderItemId: customerTwoRequest.orderItem.id,
    reason: customerTwoRequest.reason,
    page: 1 satisfies number as number,
    limit: 1 satisfies number as number,
  } satisfies IShoppingMallCancellationRequest.IRequest;
  const page: IPageIShoppingMallCancellationRequest.ISummary =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerOneConnection,
      {
        body: browseInput,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "all returned cancellations belong to authenticated customer",
    page.data.every((summary) => summary.customer.id === customerOne.id),
  );
  TestValidator.predicate(
    "other customer's cancellation is never returned",
    page.data.every((summary) => summary.id !== customerTwoRequest.id),
  );
  TestValidator.predicate(
    "own cancellation remains discoverable despite hostile filters",
    page.data.some((summary) => summary.id === customerOneRequest.id),
  );
  TestValidator.predicate(
    "pagination record count covers returned rows",
    page.pagination.records >= page.data.length,
  );
}
