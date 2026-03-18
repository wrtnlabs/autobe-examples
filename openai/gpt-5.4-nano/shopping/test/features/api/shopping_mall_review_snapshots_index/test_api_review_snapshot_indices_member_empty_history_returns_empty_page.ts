import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshotsIndex";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshotsIndex";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_review_snapshot_indices_member_empty_history_returns_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    page: 1,
    limit: 5,
    sortDirection: "asc",
    includeDeleted: false,
  } satisfies IShoppingMallReviewSnapshotsIndex.IRequest;
  const page =
    await api.functional.shoppingMall.member.reviews.snapshot_indices.index(
      memberConnection,
      {
        reviewId,
        body,
      },
    );
  typia.assert(page);
  TestValidator.equals("records should be zero", page.pagination.records, 0);
  TestValidator.equals("pages should be zero", page.pagination.pages, 0);
  TestValidator.equals("data should be empty", page.data.length, 0);
  const page2 =
    await api.functional.shoppingMall.member.reviews.snapshot_indices.index(
      memberConnection,
      {
        reviewId,
        body,
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "records should remain zero",
    page2.pagination.records,
    0,
  );
  TestValidator.equals("pages should remain zero", page2.pagination.pages, 0);
  TestValidator.equals("data should remain empty", page2.data.length, 0);
}
