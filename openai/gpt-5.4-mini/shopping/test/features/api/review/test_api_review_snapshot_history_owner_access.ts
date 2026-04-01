import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReviewSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_snapshot_history_owner_access(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(owner);
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const page =
    await api.functional.mallPlatform.customer.reviews.snapshots.index(
      ownerConnection,
      {
        reviewId,
        body: {
          reviewId,
          customerId: owner.id,
          page: 1,
          limit: 10,
          sort: "createdAt",
          order: "desc",
        } satisfies IMallPlatformReviewSnapshot.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page should be 1",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    page.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot data should be an array",
    Array.isArray(page.data),
  );
  for (const snapshot of page.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "snapshot should reference the authenticated owner",
      snapshot.customer.id,
      owner.id,
    );
    TestValidator.equals(
      "snapshot should use the requested review id",
      snapshot.review.id,
      reviewId,
    );
    TestValidator.predicate(
      "snapshot timestamp should not be empty",
      snapshot.createdAt.length > 0,
    );
  }
}
