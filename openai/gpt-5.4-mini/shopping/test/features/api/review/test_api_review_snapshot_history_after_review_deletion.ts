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

export async function test_api_review_snapshot_history_after_review_deletion(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const request = {
    page: 1,
    limit: 100,
    order: "desc",
    sort: "createdAt",
  } satisfies IMallPlatformReviewSnapshot.IRequest;
  const first: IPageIMallPlatformReviewSnapshot.ISummary =
    await api.functional.mallPlatform.administrator.reviewSnapshots.index(
      adminConnection,
      { body: request },
    );
  typia.assert(first);
  const second: IPageIMallPlatformReviewSnapshot.ISummary =
    await api.functional.mallPlatform.administrator.reviewSnapshots.index(
      adminConnection,
      { body: request },
    );
  typia.assert(second);
  TestValidator.equals(
    "repeated reads return the same pagination",
    second.pagination,
    first.pagination,
  );
  TestValidator.equals(
    "repeated reads return the same record count",
    second.data.length,
    first.data.length,
  );
  if (first.data.length > 0) {
    const snapshot = first.data[0];
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot references a review",
      snapshot.review.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot references a customer",
      snapshot.customer.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot has a recorded creation time",
      snapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot deletion state is a boolean",
      typeof snapshot.isDeleted === "boolean",
    );
    const reviewScoped =
      await api.functional.mallPlatform.administrator.reviewSnapshots.index(
        adminConnection,
        {
          body: {
            reviewId: snapshot.review.id,
            page: 1,
            limit: 100,
            order: "desc",
            sort: "createdAt",
          } satisfies IMallPlatformReviewSnapshot.IRequest,
        },
      );
    typia.assert(reviewScoped);
    TestValidator.predicate(
      "scoped query contains the requested review",
      reviewScoped.data.every((item) => item.review.id === snapshot.review.id),
    );
    TestValidator.equals(
      "scoped reads are stable",
      reviewScoped.data.length,
      (
        await api.functional.mallPlatform.administrator.reviewSnapshots.index(
          adminConnection,
          {
            body: {
              reviewId: snapshot.review.id,
              page: 1,
              limit: 100,
              order: "desc",
              sort: "createdAt",
            } satisfies IMallPlatformReviewSnapshot.IRequest,
          },
        )
      ).data.length,
    );
  }
}
