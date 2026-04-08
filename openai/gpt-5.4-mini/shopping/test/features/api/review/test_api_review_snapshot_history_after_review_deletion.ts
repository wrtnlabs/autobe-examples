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

export async function test_api_review_snapshot_history_after_review_deletion(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  const review = await generate_random_mall_platform_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: 5,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(review);
  const snapshots =
    await api.functional.mallPlatform.administrator.reviews.snapshots.index(
      administratorConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 20,
          sort: "createdAt",
          order: "desc",
        } satisfies IMallPlatformReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.predicate(
    "review snapshot history should contain preserved entries",
    snapshots.data.length > 0,
  );
  TestValidator.equals(
    "snapshot page current should be first page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "snapshot page limit should match request",
    snapshots.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "snapshot count should be non-negative",
    snapshots.pagination.records >= snapshots.data.length,
  );
  const latestSnapshot = snapshots.data[0];
  TestValidator.equals(
    "snapshot review id should match the reviewed item",
    latestSnapshot.review.id,
    review.id,
  );
  TestValidator.equals(
    "snapshot rating should preserve the review rating",
    latestSnapshot.rating,
    review.rating,
  );
  TestValidator.equals(
    "snapshot content should preserve the review content",
    latestSnapshot.content,
    review.content,
  );
  TestValidator.equals(
    "snapshot deletion flag should reflect preserved state",
    latestSnapshot.isDeleted,
    review.deleted_at !== null,
  );
  TestValidator.equals(
    "snapshot customer should match the author",
    latestSnapshot.customer.id,
    review.customer.id,
  );
}
