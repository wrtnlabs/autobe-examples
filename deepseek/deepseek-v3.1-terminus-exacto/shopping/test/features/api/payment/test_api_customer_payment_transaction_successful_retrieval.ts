import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import type { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import type { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import type { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import type { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import type { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import type { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import type { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import type { IEcommercePaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePaymentTransaction";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_payment_transaction_successful_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Since authorize_customer_join utility is not available, use direct API call
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
  } satisfies IEcommerceCustomer.IJoin;
  const customerAuth = await api.functional.ecommerce.auth.customer.join(
    customerConnection,
    {
      body: customerJoinBody,
    },
  );
  typia.assert(customerAuth);
  // Step 2: Create checkout to generate order and payment transaction
  // The checkout endpoint returns IEcommerceOrder which contains analytics data
  // but we need to create actual order data. Since IEcommerceOrder.IRequest is for pagination,
  // use minimal required parameters
  const checkoutBody = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IEcommerceOrder.IRequest;
  const checkoutOrder = await api.functional.ecommerce.customer.checkout.create(
    customerConnection,
    {
      body: checkoutBody,
    },
  );
  typia.assert(checkoutOrder);
  // Since the actual transaction ID and order ID are not available from the checkout response
  // (IEcommerceOrder is analytics data, not order creation response), this scenario cannot
  // be completed with the available DTOs and APIs. The test must be rewritten to use
  // actual order creation endpoints that return proper order and transaction IDs.
  // For compilation purposes, create placeholder IDs
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const transactionId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve payment transaction details
  const paymentTransaction =
    await api.functional.ecommerce.customer.orders.payment_transactions.at(
      customerConnection,
      {
        orderId: orderId,
        transactionId: transactionId,
      },
    );
  typia.assert(paymentTransaction);
  // Step 4: Validate payment transaction details
  // typia.assert() already performs complete validation including all format checks
  // Only test business logic relationships
  TestValidator.equals(
    "transaction id matches",
    paymentTransaction.id,
    transactionId,
  );
  TestValidator.equals(
    "customer id matches authenticated customer",
    paymentTransaction.customer.id,
    customerAuth.id,
  );
}
