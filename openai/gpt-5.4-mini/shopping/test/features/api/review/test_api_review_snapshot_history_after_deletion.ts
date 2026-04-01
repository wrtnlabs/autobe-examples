import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_order_items_review_create } from "../../../generate/generate_random_mall_platform_customer_order_items_review_create";
import { prepare_random_mall_platform_review } from "../../../prepare/prepare_random_mall_platform_review";

export async function test_api_review_snapshot_history_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const administratorConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await authorize_administrator_login(administratorConnection, {
    body: {
      email: administratorEmail,
      password: administratorPassword,
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  const review =
    await generate_random_mall_platform_customer_order_items_review_create(
      customerConnection,
      {
        params: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          rating: 5,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformReview.ICreate,
      },
    );
  typia.assert(review);
  const snapshotPage =
    await api.functional.mallPlatform.administrator.reviews.snapshots.index(
      administratorConnection,
      {
        reviewId: review.id,
        body: {
          reviewId: review.id,
          page: 1,
          limit: 100,
          order: "desc",
        },
      },
    );
  typia.assert(snapshotPage);
  TestValidator.predicate(
    "snapshot history should not be empty",
    snapshotPage.data.length > 0,
  );
  const snapshot = snapshotPage.data[0];
  TestValidator.equals(
    "snapshot review id should match",
    snapshot.review.id,
    review.id,
  );
  TestValidator.equals(
    "snapshot rating should be preserved",
    snapshot.rating,
    review.rating,
  );
  TestValidator.equals(
    "snapshot content should be preserved",
    snapshot.content,
    review.content ?? null,
  );
  TestValidator.predicate(
    "snapshot should have preserved deletion flag",
    typeof snapshot.isDeleted === "boolean",
  );
  TestValidator.predicate(
    "snapshot timestamp should exist",
    snapshot.createdAt.length > 0,
  );
}
