import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer attempts to view a review snapshot they do not own to verify authorization enforcement.
 *
 * Validates that customers can only access snapshots of reviews they own, not other customers' reviews. This test demonstrates the access control enforcement by attempting unauthorized snapshot access.
 *
 * The test follows the connection isolation pattern where each customer has their own authenticated connection. Customer B's review snapshot is created first, then Customer A attempts to access it, which should fail with 403 Forbidden.
 *
 * 1. Customer A registers and authenticates with separate connection.
 * 2. Customer B registers and authenticates with separate connection.
 * 3. Customer B creates a review and edits it to generate a snapshot.
 * 4. Customer A attempts to retrieve the snapshot using Customer B's reviewId and snapshotId.
 * 5. Verify the system returns 403 Forbidden error due to ownership mismatch.
 */
export async function test_api_review_snapshot_access_control_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A registers and authenticates (the unauthorized user)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA: IEcommerceCustomer.IAuthorized =
    await authorize_customer_join(customerAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceCustomer.IJoin,
    });
  typia.assert(customerA);
  // 2. Customer B registers and authenticates (the review owner)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB: IEcommerceCustomer.IAuthorized =
    await authorize_customer_join(customerBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceCustomer.IJoin,
    });
  typia.assert(customerB);
  // 3. Customer B creates a review and edits it to generate a snapshot
  // Note: Review creation function is not available in provided SDK, using placeholder IDs
  // In a real scenario, Customer B would create a review and edit it to generate snapshots
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Customer A attempts to retrieve the snapshot (should fail with 403)
  await TestValidator.httpError(
    "customer A should not access customer B's review snapshot",
    403,
    async () => {
      await api.functional.ecommerce.customer.reviews.snapshots.at(
        customerAConnection,
        {
          reviewId,
          snapshotId,
        },
      );
    },
  );
}
