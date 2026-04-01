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
import { generate_random_mall_platform_customer_order_items_review_create } from "../../../generate/generate_random_mall_platform_customer_order_items_review_create";
import { prepare_random_mall_platform_review } from "../../../prepare/prepare_random_mall_platform_review";

export async function test_api_customer_review_update_preserves_purchase_link(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const initialReview =
    await generate_random_mall_platform_customer_order_items_review_create(
      customerConnection,
      {
        params: { orderItemId },
        body: {
          rating: 4,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformReview.ICreate,
      },
    );
  typia.assert(initialReview);
  const updatedBody = {
    rating: 5,
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IMallPlatformReview.IUpdate;
  const updatedReview =
    await api.functional.mallPlatform.customer.reviews.update(
      customerConnection,
      {
        reviewId: initialReview.id,
        body: updatedBody,
      },
    );
  typia.assert(updatedReview);
  TestValidator.equals(
    "review id preserved",
    updatedReview.id,
    initialReview.id,
  );
  TestValidator.equals(
    "customer linkage preserved",
    updatedReview.customer.id,
    initialReview.customer.id,
  );
  TestValidator.equals(
    "order item linkage preserved",
    updatedReview.orderItem.id,
    initialReview.orderItem.id,
  );
  TestValidator.equals(
    "product linkage preserved",
    updatedReview.product.id,
    initialReview.product.id,
  );
  TestValidator.equals(
    "rating updated",
    updatedReview.rating,
    updatedBody.rating,
  );
  TestValidator.equals(
    "content updated",
    updatedReview.content,
    updatedBody.content ?? null,
  );
  TestValidator.notEquals(
    "review state changed",
    initialReview,
    updatedReview,
    (key) => key === "updatedAt",
  );
  TestValidator.equals("review remains active", updatedReview.deletedAt, null);
}
