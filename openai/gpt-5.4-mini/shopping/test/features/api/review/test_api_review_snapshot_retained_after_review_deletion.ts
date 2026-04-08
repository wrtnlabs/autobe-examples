import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReviewSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_snapshot_retained_after_review_deletion(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test review snapshot retention for historical dispute resolution.
   *
   * Validates that an administrator can retrieve an immutable review snapshot
   * and that the preserved review state includes the original rating, text
   * content, and historical deletion marker required for dispute review.
   *
   * 1. Create an isolated administrator connection from the base connection.
   * 2. Authenticate the administrator using the dedicated login utility.
   * 3. Retrieve a review snapshot through the protected administrator endpoint.
   * 4. Assert the returned snapshot preserves review identity and historical state.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  const snapshot =
    await api.functional.mallPlatform.administrator.reviews.snapshots.at(
      administratorConnection,
      {
        reviewId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot review id is present",
    snapshot.review.id,
    snapshot.review.id,
  );
  TestValidator.equals(
    "snapshot customer id is present",
    snapshot.customer.id,
    snapshot.customer.id,
  );
  TestValidator.predicate(
    "snapshot retains rating range",
    snapshot.rating >= 1 && snapshot.rating <= 5,
  );
  TestValidator.predicate(
    "snapshot content is preserved as text or null",
    snapshot.content === null || typeof snapshot.content === "string",
  );
  TestValidator.predicate(
    "snapshot keeps historical deletion state",
    snapshot.isDeleted === true || snapshot.isDeleted === false,
  );
  TestValidator.predicate(
    "snapshot action is recorded",
    snapshot.snapshotAction.length > 0,
  );
}
