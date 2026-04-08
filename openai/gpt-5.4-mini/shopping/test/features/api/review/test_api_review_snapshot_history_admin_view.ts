import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReviewSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReviewSnapshot";
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
import { generate_random_mall_platform_customer_reviews_create } from "../../../generate/generate_random_mall_platform_customer_reviews_create";
import { prepare_random_mall_platform_review } from "../../../prepare/prepare_random_mall_platform_review";

export async function test_api_review_snapshot_history_admin_view(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate that an administrator can view immutable snapshot history for a review.
   *
   * 1. Create separate customer and administrator actor connections.
   * 2. Register and authenticate both actors.
   * 3. Create a customer review through the available review creation API.
   * 4. Request the review snapshot history as an administrator.
   * 5. Verify the response is paginated, read-only, and references the source review and owner.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const administratorConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const password = "Password123!";
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password,
      href: "https://example.com/register",
      referrer: "https://example.com/home",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: administratorEmail,
        password,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const review = await generate_random_mall_platform_customer_reviews_create(
    customerConnection,
    {
      body: {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        productId: typia.random<string & tags.Format<"uuid">>(),
        rating: 5,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(review);
  const history =
    await api.functional.mallPlatform.administrator.reviews.snapshots.index(
      administratorConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
          order: "desc",
        } satisfies IMallPlatformReviewSnapshot.IRequest,
      },
    );
  typia.assert(history);
  TestValidator.equals("snapshot history page", history.pagination.current, 1);
  TestValidator.predicate(
    "snapshot history limit positive",
    history.pagination.limit > 0,
  );
  TestValidator.predicate(
    "snapshot history page count non-negative",
    history.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot history record count non-negative",
    history.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot history references no more than page limit",
    history.data.length <= history.pagination.limit,
  );
  TestValidator.predicate(
    "snapshot history returned a page object",
    history.pagination !== undefined,
  );
  if (history.data.length > 0) {
    const first = history.data[0];
    typia.assert(first);
    TestValidator.equals(
      "snapshot review id matches",
      first.review.id,
      review.id,
    );
    TestValidator.equals(
      "snapshot owner id matches",
      first.customer.id,
      customer.id,
    );
    TestValidator.predicate(
      "snapshot preserved rating range",
      first.rating >= 1 && first.rating <= 5,
    );
    TestValidator.predicate(
      "snapshot created at is present",
      first.createdAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot action is present",
      first.snapshotAction.length > 0,
    );
  }
}
