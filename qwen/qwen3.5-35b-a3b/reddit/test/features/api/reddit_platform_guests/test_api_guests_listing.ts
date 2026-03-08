import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformGuest";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guests_listing(
  connection: api.IConnection,
): Promise<void> {
  // Success scenario: Default pagination
  {
    const defaultConnection: api.IConnection = { host: connection.host };
    const defaultResult = await api.functional.redditPlatform.guests.index(
      defaultConnection,
      {
        body: typia.random<IRedditPlatformGuest.IRequest>(),
      },
    );
    typia.assert(defaultResult);
    TestValidator.equals(
      "default pagination current page",
      defaultResult.pagination.current,
      1,
    );
    TestValidator.equals(
      "default pagination limit",
      defaultResult.pagination.limit,
      20,
    );
    TestValidator.predicate(
      "default pagination has records",
      defaultResult.pagination.records >= 1,
    );
    TestValidator.predicate(
      "pagination pages calculated correctly",
      defaultResult.pagination.pages >= 1,
    );
    TestValidator.predicate(
      "data array has at least one guest",
      defaultResult.data.length >= 1,
    );
    if (defaultResult.data.length > 0) {
      const firstGuest = defaultResult.data[0];
      typia.assert(firstGuest);
    }
  }
  // Filtering scenario: deviceFingerprint
  {
    const filteredByDeviceConnection: api.IConnection = {
      host: connection.host,
    };
    const devicePattern = "mobile";
    const filteredResult = await api.functional.redditPlatform.guests.index(
      filteredByDeviceConnection,
      {
        body: {
          deviceFingerprint: devicePattern,
        } satisfies IRedditPlatformGuest.IRequest,
      },
    );
    typia.assert(filteredResult);
    TestValidator.equals(
      "filtered pagination current page",
      filteredResult.pagination.current,
      1,
    );
    TestValidator.predicate(
      "filtered results count is valid",
      filteredResult.data.length >= 0,
    );
    if (filteredResult.data.length > 0) {
      const filteredGuest = filteredResult.data[0];
      typia.assert(filteredGuest);
    }
  }
  // Filtering scenario: date range filters
  {
    const dateFilterConnection: api.IConnection = { host: connection.host };
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const threeDaysAgo = new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const dateFilteredResult = await api.functional.redditPlatform.guests.index(
      dateFilterConnection,
      {
        body: {
          sessionCreatedAtFrom: sevenDaysAgo,
          lastActivityFrom: threeDaysAgo,
        } satisfies IRedditPlatformGuest.IRequest,
      },
    );
    typia.assert(dateFilteredResult);
    TestValidator.equals(
      "date filtered pagination current page",
      dateFilteredResult.pagination.current,
      1,
    );
    TestValidator.predicate(
      "date filtered data array exists",
      Array.isArray(dateFilteredResult.data),
    );
  }
  // Filtering scenario: post view count
  {
    const postViewFilterConnection: api.IConnection = { host: connection.host };
    const postViewFilteredResult =
      await api.functional.redditPlatform.guests.index(
        postViewFilterConnection,
        {
          body: {
            postViewCountMin: 10,
          } satisfies IRedditPlatformGuest.IRequest,
        },
      );
    typia.assert(postViewFilteredResult);
    TestValidator.equals(
      "post view filtered pagination current page",
      postViewFilteredResult.pagination.current,
      1,
    );
    TestValidator.predicate(
      "post view filtered pagination limit within range",
      postViewFilteredResult.pagination.limit <= 100,
    );
  }
  // Pagination scenario: page=2 with limit=10
  {
    const secondPageConnection: api.IConnection = { host: connection.host };
    const secondPageResult = await api.functional.redditPlatform.guests.index(
      secondPageConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditPlatformGuest.IRequest,
      },
    );
    typia.assert(secondPageResult);
    TestValidator.equals(
      "second page current page",
      secondPageResult.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit",
      secondPageResult.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "second page pagination pages calculated",
      secondPageResult.pagination.pages >= 1,
    );
    if (secondPageResult.data.length > 0) {
      typia.assert(secondPageResult.data[0]);
    }
  }
  // Pagination scenario: beyond available pages (page=100)
  {
    const beyondPageConnection: api.IConnection = { host: connection.host };
    const beyondPageResult = await api.functional.redditPlatform.guests.index(
      beyondPageConnection,
      {
        body: {
          page: 100,
          limit: 20,
        } satisfies IRedditPlatformGuest.IRequest,
      },
    );
    typia.assert(beyondPageResult);
    TestValidator.equals(
      "beyond page current page",
      beyondPageResult.pagination.current,
      100,
    );
    TestValidator.equals(
      "beyond page limit",
      beyondPageResult.pagination.limit,
      20,
    );
    TestValidator.equals(
      "beyond page has no data",
      beyondPageResult.data.length,
      0,
    );
    TestValidator.predicate(
      "beyond page records count valid",
      beyondPageResult.pagination.records >= 0,
    );
  }
}
