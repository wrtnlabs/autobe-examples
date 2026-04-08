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

export async function test_api_review_snapshot_history_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "Password123!",
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` as string &
        tags.Format<"email">,
      password: "Password123!" as string & tags.Format<"password">,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await authorize_customer_login(customerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` as string &
        tags.Format<"email">,
      password: "Password123!" as string & tags.Format<"password">,
    } satisfies IMallPlatformCustomer.ILogin,
  });
  const review = await generate_random_mall_platform_customer_reviews_create(
    customerConnection,
    {
      body: {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        productId: typia.random<string & tags.Format<"uuid">>(),
        rating: 5,
        content: `snapshot pagination review ${RandomGenerator.alphabets(5)}`,
      } satisfies IMallPlatformReview.ICreate,
    },
  );
  typia.assert(review);
  const firstPage =
    await api.functional.mallPlatform.administrator.reviews.snapshots.index(
      administratorConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformReviewSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "snapshot page limit is respected",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "snapshot page metadata is non-negative",
    firstPage.pagination.records >= 0 && firstPage.pagination.pages >= 0,
  );
  if (firstPage.data.length >= 2) {
    TestValidator.predicate(
      "snapshots are ordered newest first by default",
      firstPage.data[0].createdAt >= firstPage.data[1].createdAt,
    );
  }
  if (firstPage.data.length > 0) {
    const firstSnapshot = firstPage.data[0];
    typia.assert(firstSnapshot);
    const filteredRequest: IMallPlatformReviewSnapshot.IRequest = {
      page: 1,
      limit: 10,
      snapshotAction: firstSnapshot.snapshotAction,
      isDeleted: firstSnapshot.isDeleted,
      createdFrom: firstSnapshot.createdAt,
      createdTo: firstSnapshot.createdAt,
    };
    if (firstSnapshot.content !== null)
      filteredRequest.content = firstSnapshot.content;
    const filteredByAction =
      await api.functional.mallPlatform.administrator.reviews.snapshots.index(
        administratorConnection,
        {
          reviewId: review.id,
          body: filteredRequest,
        },
      );
    typia.assert(filteredByAction);
    TestValidator.predicate(
      "filtered snapshot page contains only matching snapshot action",
      filteredByAction.data.every(
        (item) => item.snapshotAction === firstSnapshot.snapshotAction,
      ),
    );
    TestValidator.predicate(
      "filtered snapshot page contains only matching deletion state",
      filteredByAction.data.every(
        (item) => item.isDeleted === firstSnapshot.isDeleted,
      ),
    );
    TestValidator.predicate(
      "filtered snapshot page contains only snapshots within the requested time range",
      filteredByAction.data.every(
        (item) =>
          item.createdAt >= firstSnapshot.createdAt &&
          item.createdAt <= firstSnapshot.createdAt,
      ),
    );
  }
}
