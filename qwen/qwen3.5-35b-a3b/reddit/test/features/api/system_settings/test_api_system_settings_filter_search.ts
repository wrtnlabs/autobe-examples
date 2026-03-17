import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemSetting";
import type { IRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_settings_filter_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test key text search - partial match
  {
    const searchKey = "auth";
    const response = await api.functional.redditCommunity.system_settings.index(
      connection,
      {
        body: {
          key: searchKey,
        } satisfies IRedditCommunitySystemSetting.IRequest,
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "key search returns valid pagination",
      response.pagination.current >= 1,
      true,
    );
    TestValidator.equals(
      "all records match key search",
      response.data.every((item) => item.key.includes(searchKey)),
      true,
    );
  }
  // 2. Test description text search - partial case-insensitive match
  {
    const searchDesc = "user";
    const response = await api.functional.redditCommunity.system_settings.index(
      connection,
      {
        body: {
          description: searchDesc,
        } satisfies IRedditCommunitySystemSetting.IRequest,
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "description search returns valid pagination",
      response.pagination.current >= 1,
      true,
    );
    TestValidator.equals(
      "description search returns valid data array",
      Array.isArray(response.data),
      true,
    );
  }
  // 3. Test soft-delete filter - retrieve deleted settings
  {
    const deletedAt = new Date().toISOString();
    const response = await api.functional.redditCommunity.system_settings.index(
      connection,
      {
        body: {
          deletedAt,
        } satisfies IRedditCommunitySystemSetting.IRequest,
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "soft-delete query returns valid pagination",
      response.pagination.current >= 1,
      true,
    );
  }
  // 4. Test created date range filter
  {
    const now = new Date();
    const twoDaysAgo = new Date(
      now.getTime() - 48 * 60 * 60 * 1000,
    ).toISOString();
    const oneDayFuture = new Date(
      now.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
    const response = await api.functional.redditCommunity.system_settings.index(
      connection,
      {
        body: {
          createdAfter: twoDaysAgo,
          createdBefore: oneDayFuture,
        } satisfies IRedditCommunitySystemSetting.IRequest,
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "created date range returns valid pagination",
      response.pagination.current >= 1,
      true,
    );
    // Verify each returned item is within date range
    for (const item of response.data) {
      TestValidator.predicate(
        `item ${item.id} created_at is within range`,
        new Date(item.created_at) >= new Date(twoDaysAgo) &&
          new Date(item.created_at) <= new Date(oneDayFuture),
      );
    }
  }
  // 5. Test updated date range filter
  {
    const now = new Date();
    const twoDaysAgo = new Date(
      now.getTime() - 48 * 60 * 60 * 1000,
    ).toISOString();
    const oneDayFuture = new Date(
      now.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
    const response = await api.functional.redditCommunity.system_settings.index(
      connection,
      {
        body: {
          updatedAfter: twoDaysAgo,
          updatedBefore: oneDayFuture,
        } satisfies IRedditCommunitySystemSetting.IRequest,
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "updated date range returns valid pagination",
      response.pagination.current >= 1,
      true,
    );
    // Verify each returned item is within updated date range
    for (const item of response.data) {
      TestValidator.predicate(
        `item ${item.id} updated_at is within range`,
        new Date(item.updated_at) >= new Date(twoDaysAgo) &&
          new Date(item.updated_at) <= new Date(oneDayFuture),
      );
    }
  }
  // 6. Test combined filters - key search + date range + pagination
  {
    const now = new Date();
    const twoDaysAgo = new Date(
      now.getTime() - 48 * 60 * 60 * 1000,
    ).toISOString();
    const oneDayFuture = new Date(
      now.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
    const response = await api.functional.redditCommunity.system_settings.index(
      connection,
      {
        body: {
          key: "auth",
          createdAfter: twoDaysAgo,
          createdBefore: oneDayFuture,
          limit: 20,
        } satisfies IRedditCommunitySystemSetting.IRequest,
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "combined filters return valid pagination",
      response.pagination.current >= 1,
      true,
    );
    TestValidator.equals(
      "response limit matches request",
      response.pagination.limit,
      20,
    );
    TestValidator.equals(
      "all records match key filter",
      response.data.every((item) => item.key.includes("auth")),
      true,
    );
    // Verify date range constraint
    for (const item of response.data) {
      TestValidator.predicate(
        `item ${item.id} created_at is within range`,
        new Date(item.created_at) >= new Date(twoDaysAgo) &&
          new Date(item.created_at) <= new Date(oneDayFuture),
      );
    }
  }
  // 7. Test empty search results - non-matching key
  {
    const response = await api.functional.redditCommunity.system_settings.index(
      connection,
      {
        body: {
          key: "nonexistent_key_xyz_123",
        } satisfies IRedditCommunitySystemSetting.IRequest,
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "empty search returns zero records",
      response.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty search has empty data array",
      response.data.length,
      0,
    );
  }
  // 8. Test different page numbers
  {
    const firstPage =
      await api.functional.redditCommunity.system_settings.index(connection, {
        body: {
          page: 1,
          limit: 5,
        } satisfies IRedditCommunitySystemSetting.IRequest,
      });
    typia.assert(firstPage);
    const secondPage =
      await api.functional.redditCommunity.system_settings.index(connection, {
        body: {
          page: 2,
          limit: 5,
        } satisfies IRedditCommunitySystemSetting.IRequest,
      });
    typia.assert(secondPage);
    TestValidator.notEquals(
      "different pages have different data",
      firstPage.data,
      secondPage.data,
    );
    TestValidator.equals(
      "page 1 current is 1",
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      "page 2 current is 2",
      secondPage.pagination.current,
      2,
    );
  }
  // 9. Test cursor-based pagination boundary - excessive page
  {
    const lastPageResponse =
      await api.functional.redditCommunity.system_settings.index(connection, {
        body: {
          page: 999999, // Request beyond available pages
          limit: 1,
        } satisfies IRedditCommunitySystemSetting.IRequest,
      });
    typia.assert(lastPageResponse);
    TestValidator.equals(
      "excessive page returns zero records",
      lastPageResponse.pagination.records,
      0,
    );
    TestValidator.equals(
      "excessive page has empty data",
      lastPageResponse.data.length,
      0,
    );
  }
}
