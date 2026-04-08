import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_review_get_deleted_user_display_state(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const review = await api.functional.mallPlatform.seller.reviews.at(
    sellerConnection,
    { reviewId },
  );
  typia.assert(review);
  TestValidator.equals(
    "review id should match the requested identifier",
    review.reviewId,
    reviewId,
  );
  TestValidator.predicate(
    "customer summary should be present",
    () => review.customer !== null && review.customer !== undefined,
  );
  TestValidator.equals(
    "deleted user display state should be preserved",
    review.displayState,
    "deletedUser",
  );
  TestValidator.predicate(
    "customer summary should retain historical ownership fields",
    () =>
      review.customer.id.length > 0 &&
      review.customer.email.length > 0 &&
      review.customer.status.length > 0,
  );
}
