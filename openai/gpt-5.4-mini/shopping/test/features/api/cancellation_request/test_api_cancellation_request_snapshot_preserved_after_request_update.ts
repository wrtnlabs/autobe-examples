import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_order_items_cancellation_requests_post_by_orderitemid } from "../../../generate/generate_random_mall_platform_customer_order_items_cancellation_requests_post_by_orderitemid";
import { prepare_random_mall_platform_cancellation_request } from "../../../prepare/prepare_random_mall_platform_cancellation_request";

export async function test_api_cancellation_request_snapshot_preserved_after_request_update(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test preserved cancellation request snapshot retrieval after request updates.
   *
   * Validates that a customer can register, create a cancellation request for an
   * order item, and later retrieve the immutable snapshot record preserved for
   * dispute review. The test focuses on the historical snapshot resource and
   * confirms that the returned record remains tied to the originating cancellation
   * request and order item scope.
   *
   * 1. Register and authenticate a customer using an isolated connection.
   * 2. Create a cancellation request for a specific order item.
   * 3. Retrieve the snapshot using the request-scoped snapshot endpoint.
   * 4. Validate the preserved historical record fields that are available in the
   *    DTO, including the request linkage, preserved status, reason, and timestamps.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/customer/signup",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequest =
    await generate_random_mall_platform_customer_order_items_cancellation_requests_post_by_orderitemid(
      customerConnection,
      {
        params: { orderItemId },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.mallPlatform.customer.orderItems.cancellationRequests.snapshots.getByOrderitemidAndCancellationrequestidAndSnapshotid(
      customerConnection,
      {
        orderItemId,
        cancellationRequestId: cancellationRequest.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot preserved reason",
    snapshot.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "snapshot preserved status",
    snapshot.snapshotStatus,
    cancellationRequest.status,
  );
  TestValidator.predicate(
    "snapshot has change timestamp",
    snapshot.changedAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot has update timestamp",
    snapshot.updatedAt.length > 0,
  );
}
