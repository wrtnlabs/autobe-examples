import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_status_types_pagination_and_ordering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Test first page with limit 5
  const firstPage =
    await api.functional.discussionBoard.admin.status_types.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardStatusType.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate pagination metadata for first page
  TestValidator.equals(
    "first page current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page limit", firstPage.pagination.limit, 5);
  TestValidator.predicate(
    "first page records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  // Test second page with same limit
  const secondPage =
    await api.functional.discussionBoard.admin.status_types.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardStatusType.IRequest,
      },
    );
  typia.assert(secondPage);
  // Validate pagination metadata for second page
  TestValidator.equals(
    "second page current page",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals("second page limit", secondPage.pagination.limit, 5);
  TestValidator.equals(
    "second page records count",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "second page pages count",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );
  // Test ordering by display_order
  if (firstPage.data.length > 1) {
    for (let i = 1; i < firstPage.data.length; i++) {
      TestValidator.predicate(
        `display_order should be ascending at position ${i}`,
        firstPage.data[i].display_order >= firstPage.data[i - 1].display_order,
      );
    }
  }
  if (secondPage.data.length > 1) {
    for (let i = 1; i < secondPage.data.length; i++) {
      TestValidator.predicate(
        `second page display_order should be ascending at position ${i}`,
        secondPage.data[i].display_order >=
          secondPage.data[i - 1].display_order,
      );
    }
  }
  // Test edge case: page beyond available pages (only if there are pages)
  if (firstPage.pagination.pages > 0) {
    const highPage =
      await api.functional.discussionBoard.admin.status_types.index(
        adminConnection,
        {
          body: {
            page: firstPage.pagination.pages + 10,
            limit: 5,
          } satisfies IDiscussionBoardStatusType.IRequest,
        },
      );
    typia.assert(highPage);
    TestValidator.equals(
      "high page should have no data",
      highPage.data.length,
      0,
    );
    TestValidator.equals(
      "high page current page",
      highPage.pagination.current,
      firstPage.pagination.pages + 10,
    );
    TestValidator.equals("high page limit", highPage.pagination.limit, 5);
    TestValidator.equals(
      "high page records count",
      highPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "high page pages count",
      highPage.pagination.pages,
      firstPage.pagination.pages,
    );
  }
  // Test last page with potentially fewer items (only if there are multiple pages)
  if (firstPage.pagination.pages > 1) {
    const lastPage =
      await api.functional.discussionBoard.admin.status_types.index(
        adminConnection,
        {
          body: {
            page: firstPage.pagination.pages,
            limit: 5,
          } satisfies IDiscussionBoardStatusType.IRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page current page",
      lastPage.pagination.current,
      firstPage.pagination.pages,
    );
    TestValidator.equals("last page limit", lastPage.pagination.limit, 5);
    TestValidator.equals(
      "last page records count",
      lastPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "last page pages count",
      lastPage.pagination.pages,
      firstPage.pagination.pages,
    );
    TestValidator.predicate(
      "last page should have fewer or equal items than limit",
      lastPage.data.length <= 5,
    );
  }
}
