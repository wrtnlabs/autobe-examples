import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_review_snapshot_history_owner_access(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = `${RandomGenerator.alphaNumeric(12)}@test.com`;
  const sellerPassword = `P@ssw0rd${RandomGenerator.alphaNumeric(8)}`;
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const review = await api.functional.mallPlatform.seller.reviews.at(
    sellerConnection,
    {
      reviewId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(review);
  const output =
    await api.functional.mallPlatform.seller.reviews.snapshots.index(
      sellerConnection,
      {
        reviewId: review.reviewId,
        body: {
          page: 1,
          limit: 10,
          sort: "-createdAt",
        } satisfies IMallPlatformReviewSnapshot.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "snapshot history page number",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "snapshot history page limit",
    output.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "snapshot history entries belong to the requested review",
    output.data.every((snapshot) => snapshot.review.id === review.reviewId),
  );
  TestValidator.predicate(
    "snapshot history entries preserve review ownership",
    output.data.every(
      (snapshot) => snapshot.customer.id === review.customer.id,
    ),
  );
  TestValidator.predicate(
    "snapshot history entries are ordered newest first",
    output.data.every(
      (snapshot, index, array) =>
        index === 0 || array[index - 1].createdAt >= snapshot.createdAt,
    ),
  );
  TestValidator.predicate(
    "snapshot history entries preserve immutable snapshot fields",
    output.data.every(
      (snapshot) =>
        typeof snapshot.snapshotAction === "string" &&
        typeof snapshot.rating === "number" &&
        typeof snapshot.content !== "undefined" &&
        typeof snapshot.isDeleted === "boolean" &&
        typeof snapshot.createdAt === "string",
    ),
  );
}
