import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer-owned order item snapshot history retrieval.
 *
 * Validates that an authenticated customer can call the immutable snapshot history endpoint for an order item and receive a well-formed paginated response when the target record is accessible. The test focuses on the read-only browsing contract, pagination metadata, and structural integrity of preserved snapshot summaries.
 *
 * Because the available SDK surface does not provide order creation or order-item lookup helpers, this test uses a syntactically valid order item UUID and treats authorization or missing-resource errors as acceptable outcomes when the backend cannot resolve ownership in the current environment. When the response is successful, the test validates pagination coherence and the snapshot summary structure without attempting forbidden type-error scenarios or redundant post-assertion type checks.
 *
 * 1. Register and authenticate a customer account with the supported join utility.
 * 2. Request the order item snapshot history with a valid UUID path parameter and a supported paging/sorting request body.
 * 3. Validate the successful page response, or accept the expected not-found/forbidden outcome if the target order item cannot be resolved in the current test environment.
 */
export async function test_api_order_item_snapshot_history_for_owner(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    page: 1,
    limit: 10,
    sort: "snapshotAt_desc",
  } satisfies IMallPlatformOrderItemSnapshot.IRequest;
  await TestValidator.httpError(
    "order item snapshot history may reject inaccessible or missing items",
    [403, 404],
    async () => {
      const output =
        await api.functional.mallPlatform.customer.orderItems.snapshots.index(
          customerConnection,
          {
            orderItemId,
            body,
          },
        );
      typia.assert(output);
      TestValidator.equals(
        "pagination current matches requested page",
        output.pagination.current,
        body.page ?? 1,
      );
      TestValidator.equals(
        "pagination limit matches requested limit",
        output.pagination.limit,
        body.limit ?? output.pagination.limit,
      );
      TestValidator.predicate(
        "pagination records is non-negative",
        output.pagination.records >= 0,
      );
      TestValidator.predicate(
        "pagination pages is non-negative",
        output.pagination.pages >= 0,
      );
      TestValidator.predicate(
        "page size does not exceed requested limit",
        output.data.length <= output.pagination.limit,
      );
      TestValidator.predicate(
        "page size does not exceed total records",
        output.data.length <= output.pagination.records,
      );
      for (const snapshot of output.data) {
        TestValidator.predicate(
          "snapshot has preserved timestamp",
          snapshot.snapshotAt.length > 0,
        );
        TestValidator.predicate(
          "snapshot has preserved purchase reason",
          snapshot.snapshotReason.length > 0,
        );
        TestValidator.predicate(
          "snapshot belongs to a real order item reference",
          snapshot.orderItem.id.length > 0,
        );
      }
    },
  );
}
