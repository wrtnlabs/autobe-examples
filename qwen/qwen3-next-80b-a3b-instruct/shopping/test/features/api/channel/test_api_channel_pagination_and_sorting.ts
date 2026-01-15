import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_channel_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to access channel search functionality
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Test pagination with different limit sizes and page numbers
  const limits = [5, 10, 25];
  const pages = [1, 2, 3];
  for (const limit of limits) {
    for (const page of pages) {
      // Fetch paginated results
      const response = await api.functional.shoppingMall.channels.index(
        adminConnection,
        {
          body: {
            page,
            limit,
          } satisfies IShoppingMallChannel.IRequest,
        },
      );
      // Validate pagination structure
      typia.assert(response);
      // Check pagination metadata
      TestValidator.equals(
        "page number matches",
        response.pagination.current,
        page,
      );
      TestValidator.equals("limit matches", response.pagination.limit, limit);
      TestValidator.predicate(
        "total records is non-negative",
        response.pagination.records >= 0,
      );
      TestValidator.predicate(
        "total pages is non-negative",
        response.pagination.pages >= 0,
      );
      // Validate that we received the correct number of items
      TestValidator.predicate(
        "number of items per page is within limits",
        response.data.length <= limit,
      );
      TestValidator.predicate(
        "number of items per page is non-negative",
        response.data.length >= 0,
      );
    }
  }
  // Step 3: Test sorting by name (ascending)
  const nameSortedResponse = await api.functional.shoppingMall.channels.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sortBy: "name",
        sortOrder: "asc",
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(nameSortedResponse);
  // Verify that we have at least 2 items to compare for sorting
  if (nameSortedResponse.data.length >= 2) {
    // Verify that names are alphabetically sorted
    for (let i = 1; i < nameSortedResponse.data.length; i++) {
      TestValidator.predicate(
        "names sorted alphabetically",
        nameSortedResponse.data[i - 1].name.localeCompare(
          nameSortedResponse.data[i].name,
        ) <= 0,
      );
    }
  }
  // Step 4: Test sorting by creation date (descending)
  const dateSortedResponse = await api.functional.shoppingMall.channels.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(dateSortedResponse);
  // Verify that we have at least 2 items to compare for sorting
  if (dateSortedResponse.data.length >= 2) {
    // Verify that channels are sorted by creation date newest to oldest
    for (let i = 1; i < dateSortedResponse.data.length; i++) {
      TestValidator.predicate(
        "created dates sorted newest first",
        new Date(dateSortedResponse.data[i - 1].createdAt).getTime() >=
          new Date(dateSortedResponse.data[i].createdAt).getTime(),
      );
    }
  }
  // Step 5: Test sorting by status (ascending)
  const statusSortedResponse = await api.functional.shoppingMall.channels.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sortBy: "status",
        sortOrder: "asc",
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(statusSortedResponse);
  // Verify that we have at least 2 items to compare for sorting
  if (statusSortedResponse.data.length >= 2) {
    // Verify that channels are sorted by status in ascending order: active, inactive, archived
    const statusOrder = { active: 0, inactive: 1, archived: 2 };
    for (let i = 1; i < statusSortedResponse.data.length; i++) {
      const prevOrder = statusOrder[statusSortedResponse.data[i - 1].status];
      const currOrder = statusOrder[statusSortedResponse.data[i].status];
      TestValidator.predicate(
        "status sorted ascending",
        prevOrder <= currOrder,
      );
    }
  }
  // Step 6: Test combined sorting and pagination
  const combinedResponse = await api.functional.shoppingMall.channels.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
        sortBy: "name",
        sortOrder: "asc",
      } satisfies IShoppingMallChannel.IRequest,
    },
  );
  typia.assert(combinedResponse);
  // Validate pagination metadata is correct
  TestValidator.equals(
    "combined page number",
    combinedResponse.pagination.current,
    2,
  );
  TestValidator.equals("combined limit", combinedResponse.pagination.limit, 5);
  // Verify that we have items for combined sorting
  if (combinedResponse.data.length > 0) {
    // Validate that the items are sorted by name in ascending order
    for (let i = 1; i < combinedResponse.data.length; i++) {
      TestValidator.predicate(
        "combined results sorted by name",
        combinedResponse.data[i - 1].name.localeCompare(
          combinedResponse.data[i].name,
        ) <= 0,
      );
    }
  }
}
