import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDashboard";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the seller dashboard cancellation-refund endpoint to verify it returns valid statistics structure.
 *
 * Due to API limitations (no product creation, order placement, or refund request endpoints available in the provided SDK), this test validates the endpoint response structure and type correctness rather than specific count values.
 *
 * 1. Register and authenticate a seller account using authorize_seller_join utility function.
 * 2. Call the seller dashboard cancellation-refund endpoint to retrieve pending request counts.
 * 3. Validate the response structure using typia.assert() to ensure both cancellationPendingCount and refundPendingCount are present and are non-negative integers.
 * 4. Verify the counts are valid numbers (>= 0) as per the DTO specification.
 *
 * This validates that the dashboard endpoint is accessible to authenticated sellers and returns properly structured data conforming to IShoppingMallDashboard.ICancellationRefund type definition.
 */
export async function test_api_seller_dashboard_cancellation_refund_pending_refunds(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Call dashboard cancellation-refund endpoint
  const dashboard =
    await api.functional.shoppingMall.seller.dashboard.cancellation_refund.at(
      sellerConnection,
    );
  typia.assert(dashboard);
  // 3. Validate response structure and count values
  TestValidator.predicate(
    "cancellationPendingCount is non-negative",
    dashboard.cancellationPendingCount >= 0,
  );
  TestValidator.predicate(
    "refundPendingCount is non-negative",
    dashboard.refundPendingCount >= 0,
  );
  TestValidator.equals(
    "cancellationPendingCount type",
    typeof dashboard.cancellationPendingCount,
    "number",
  );
  TestValidator.equals(
    "refundPendingCount type",
    typeof dashboard.refundPendingCount,
    "number",
  );
}
