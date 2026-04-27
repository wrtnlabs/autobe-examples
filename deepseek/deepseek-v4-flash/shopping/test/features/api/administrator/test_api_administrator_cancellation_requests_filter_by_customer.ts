import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an administrator can filter cancellation requests by a specific customer.
 *
 * Validates the administrator's ability to investigate a customer's cancellation history by filtering the cancellation requests list endpoint with a `customer_id` parameter. This simulates the business workflow where an administrator reviews cancellation behavior for dispute resolution or customer service purposes.
 *
 * First, an administrator account is created and authenticated via the utility function. Then the cancellation requests endpoint is called with the `customer_id` filter and pagination parameters. The response is validated to ensure every returned cancellation request belongs to the specified customer.
 *
 * 1. Register and authenticate an administrator account.
 * 2. Call the cancellation requests listing endpoint filtered by a specific customer UUID.
 * 3. Validate the response structure and confirm all results match the requested customer.
 */
export async function test_api_administrator_cancellation_requests_filter_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  // 2. Call cancellation requests endpoint with customer_id filter
  const customerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const output: IPageIECommerceMallCancellationRequest.ISummary =
    await api.functional.eCommerceMall.administrator.cancellation_requests.index(
      adminConnection,
      {
        body: {
          customer_id: customerId,
          page: 1,
          limit: 10,
        } satisfies IECommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(output);
  // 3. Validate that every returned cancellation request belongs to the filtered customer
  TestValidator.predicate(
    "all cancellation requests match the filtered customer_id",
    () => output.data.every((item) => item.customer.id === customerId),
  );
}
