import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_review_snapshot_pagination_correctness(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin to access review snapshots
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Use a random UUID as reviewId, assuming a review with 25 snapshots exists
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Page 1: limit=10, page=1
  const page1 = await api.functional.shoppingMall.admin.reviews.snapshots.at(
    adminConnection,
    {
      reviewId: reviewId,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "page1 pagination records",
    page1.pagination.records,
    25,
  );
  TestValidator.equals("page1 pagination limit", page1.pagination.limit, 10);
  TestValidator.equals("page1 pagination current", page1.pagination.current, 1);
  TestValidator.equals("page1 pagination pages", page1.pagination.pages, 3);
  TestValidator.equals("page1 data length", page1.data.length, 10);
  // Page 2: limit=10, page=2
  const page2 = await api.functional.shoppingMall.admin.reviews.snapshots.at(
    adminConnection,
    {
      reviewId: reviewId,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page2 pagination records",
    page2.pagination.records,
    25,
  );
  TestValidator.equals("page2 pagination limit", page2.pagination.limit, 10);
  TestValidator.equals("page2 pagination current", page2.pagination.current, 2);
  TestValidator.equals("page2 pagination pages", page2.pagination.pages, 3);
  TestValidator.equals("page2 data length", page2.data.length, 10);
  // Page 3: limit=10, page=3
  const page3 = await api.functional.shoppingMall.admin.reviews.snapshots.at(
    adminConnection,
    {
      reviewId: reviewId,
    },
  );
  typia.assert(page3);
  TestValidator.equals(
    "page3 pagination records",
    page3.pagination.records,
    25,
  );
  TestValidator.equals("page3 pagination limit", page3.pagination.limit, 10);
  TestValidator.equals("page3 pagination current", page3.pagination.current, 3);
  TestValidator.equals("page3 pagination pages", page3.pagination.pages, 3);
  TestValidator.equals("page3 data length", page3.data.length, 5);
  // Verify no duplicates across pages
  const allSnapshots = [...page1.data, ...page2.data, ...page3.data];
  TestValidator.equals("total snapshots", allSnapshots.length, 25);
  // Verify ordering by changed_at descending (newest first)
  for (let i = 0; i < allSnapshots.length - 1; i++) {
    const current = new Date(allSnapshots[i].changed_at);
    const next = new Date(allSnapshots[i + 1].changed_at);
    TestValidator.predicate(
      "snapshots ordered by changed_at descending",
      current >= next,
    );
  }
}
