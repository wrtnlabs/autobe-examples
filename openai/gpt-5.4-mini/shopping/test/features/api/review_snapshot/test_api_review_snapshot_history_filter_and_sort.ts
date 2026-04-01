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

export async function test_api_review_snapshot_history_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const newestFirstRequest = {
    page: 1,
    limit: 20,
  } satisfies IMallPlatformReviewSnapshot.IRequest;
  const newestFirst =
    await api.functional.mallPlatform.administrator.reviewSnapshots.index(
      adminConnection,
      { body: newestFirstRequest },
    );
  typia.assert(newestFirst);
  TestValidator.predicate(
    "review snapshot pagination metadata should be valid",
    newestFirst.pagination.current >= 1 &&
      newestFirst.pagination.limit >= 0 &&
      newestFirst.pagination.records >= 0 &&
      newestFirst.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "review snapshot data should be an array",
    Array.isArray(newestFirst.data),
  );
  if (newestFirst.data.length >= 2) {
    TestValidator.predicate(
      "default ordering should be newest first when sort is omitted",
      newestFirst.data[0].createdAt >= newestFirst.data[1].createdAt,
    );
  }
  const ascendingRequest = {
    page: 1,
    limit: 20,
    sort: "createdAt",
    order: "asc",
  } satisfies IMallPlatformReviewSnapshot.IRequest;
  const ascending =
    await api.functional.mallPlatform.administrator.reviewSnapshots.index(
      adminConnection,
      { body: ascendingRequest },
    );
  typia.assert(ascending);
  if (ascending.data.length >= 2) {
    TestValidator.predicate(
      "ascending sort should order snapshots from oldest to newest",
      ascending.data[0].createdAt <=
        ascending.data[ascending.data.length - 1].createdAt,
    );
  }
  const filteredRequest = {
    page: 1,
    limit: 10,
    ratingMin: 1,
    ratingMax: 5,
    isDeleted: false,
    snapshotAction: "edit",
  } satisfies IMallPlatformReviewSnapshot.IRequest;
  const filtered =
    await api.functional.mallPlatform.administrator.reviewSnapshots.index(
      adminConnection,
      { body: filteredRequest },
    );
  typia.assert(filtered);
  TestValidator.predicate(
    "filtered response should keep pagination metadata valid",
    filtered.pagination.current >= 1 &&
      filtered.pagination.limit >= 0 &&
      filtered.pagination.records >= 0 &&
      filtered.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "filtered snapshots should respect requested deletion and rating bounds",
    filtered.data.every(
      (snapshot) =>
        snapshot.rating >= 1 &&
        snapshot.rating <= 5 &&
        snapshot.isDeleted === false,
    ),
  );
  const keywordRequest = {
    page: 1,
    limit: 10,
    content: "a",
  } satisfies IMallPlatformReviewSnapshot.IRequest;
  const keywordPage =
    await api.functional.mallPlatform.administrator.reviewSnapshots.index(
      adminConnection,
      { body: keywordRequest },
    );
  typia.assert(keywordPage);
  TestValidator.predicate(
    "keyword query should return valid pagination metadata",
    keywordPage.pagination.current >= 1 &&
      keywordPage.pagination.limit >= 0 &&
      keywordPage.pagination.records >= 0 &&
      keywordPage.pagination.pages >= 0,
  );
  if (keywordPage.data.length > 0) {
    const snapshot = keywordPage.data[0];
    TestValidator.predicate(
      "snapshot should preserve review reference",
      snapshot.review.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot should preserve customer reference",
      snapshot.customer.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot should preserve review content structure",
      typeof snapshot.content === "string" || snapshot.content === null,
    );
  }
}
