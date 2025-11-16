import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_shopping_mall_guest_search_and_filter(
  connection: api.IConnection,
) {
  // 1. Test basic pagination with page=1, limit=10
  {
    const requestBody = {
      page: 1,
      limit: 10,
    } satisfies IShoppingMallGuest.IRequest;
    const response = await api.functional.shoppingMall.guests.index(
      connection,
      { body: requestBody },
    );
    typia.assert(response);
    TestValidator.equals("pagination page", response.pagination.current, 1);
    TestValidator.equals("pagination limit", response.pagination.limit, 10);
    TestValidator.predicate(
      "pagination records >= data length",
      response.pagination.records >= response.data.length,
    );
    TestValidator.predicate(
      "pagination pages >= 1",
      response.pagination.pages >= 1,
    );
  }

  // 2. Test pagination with search string to filter guests
  {
    const searchString = RandomGenerator.substring(
      RandomGenerator.content({
        paragraphs: 3,
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 3,
        wordMax: 8,
      }),
    );
    const requestBody = {
      page: 1,
      limit: 10,
      search: searchString,
    } satisfies IShoppingMallGuest.IRequest;
    const response = await api.functional.shoppingMall.guests.index(
      connection,
      { body: requestBody },
    );
    typia.assert(response);
    // Every guest's id or other properties might be searched, but we only assert pagination and data type here
    TestValidator.equals(
      "pagination page with search",
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit with search",
      response.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "search returned records >= data length",
      response.pagination.records >= response.data.length,
    );
  }

  // 3. Test filtering by created_at_from and created_at_to timestamps
  {
    const nowIso = new Date().toISOString();
    const oneDayAgoIso = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();
    const requestBody = {
      page: 1,
      limit: 10,
      created_at_from: oneDayAgoIso,
      created_at_to: nowIso,
    } satisfies IShoppingMallGuest.IRequest;
    const response = await api.functional.shoppingMall.guests.index(
      connection,
      { body: requestBody },
    );
    typia.assert(response);
    TestValidator.equals(
      "pagination page with created_at filter",
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit with created_at filter",
      response.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "created_at filter returned records >= data length",
      response.pagination.records >= response.data.length,
    );
    // Validate each data's created_at is within range
    for (const guest of response.data) {
      const createdAt = guest.created_at;
      TestValidator.predicate(
        `guest.created_at >= created_at_from (${oneDayAgoIso})`,
        createdAt >= oneDayAgoIso,
      );
      TestValidator.predicate(
        `guest.created_at <= created_at_to (${nowIso})`,
        createdAt <= nowIso,
      );
    }
  }

  // 4. Test filtering by updated_at_from and updated_at_to timestamps
  {
    const nowIso = new Date().toISOString();
    const twoDaysAgoIso = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const requestBody = {
      page: 1,
      limit: 10,
      updated_at_from: twoDaysAgoIso,
      updated_at_to: nowIso,
    } satisfies IShoppingMallGuest.IRequest;
    const response = await api.functional.shoppingMall.guests.index(
      connection,
      { body: requestBody },
    );
    typia.assert(response);
    TestValidator.equals(
      "pagination page with updated_at filter",
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit with updated_at filter",
      response.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "updated_at filter returned records >= data length",
      response.pagination.records >= response.data.length,
    );
    // Validate each data's updated_at is within range
    for (const guest of response.data) {
      if (guest.last_active_at !== null && guest.last_active_at !== undefined) {
        const updatedAt = guest.last_active_at;
        TestValidator.predicate(
          `guest.last_active_at >= updated_at_from (${twoDaysAgoIso})`,
          updatedAt >= twoDaysAgoIso,
        );
        TestValidator.predicate(
          `guest.last_active_at <= updated_at_to (${nowIso})`,
          updatedAt <= nowIso,
        );
      }
    }
  }

  // 5. Test filtering by deleted_at_is_null = true
  {
    const requestBody = {
      page: 1,
      limit: 10,
      deleted_at_is_null: true,
    } satisfies IShoppingMallGuest.IRequest;
    const response = await api.functional.shoppingMall.guests.index(
      connection,
      { body: requestBody },
    );
    typia.assert(response);
    TestValidator.equals(
      "pagination page with deleted_at_is_null true",
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit with deleted_at_is_null true",
      response.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "deleted_at_is_null true returned records >= data length",
      response.pagination.records >= response.data.length,
    );

    // We do not have deleted_at property in ISummary, so we cannot assert guest is not soft deleted
    // But the business domain implies these contain guests with deleted_at = null
    // So we trust the API's filtering
  }

  // 6. Test filtering by deleted_at_is_null = false
  {
    const requestBody = {
      page: 1,
      limit: 10,
      deleted_at_is_null: false,
    } satisfies IShoppingMallGuest.IRequest;
    const response = await api.functional.shoppingMall.guests.index(
      connection,
      { body: requestBody },
    );
    typia.assert(response);
    TestValidator.equals(
      "pagination page with deleted_at_is_null false",
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit with deleted_at_is_null false",
      response.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "deleted_at_is_null false returned records >= data length",
      response.pagination.records >= response.data.length,
    );

    // As above, ISummary doesn't expose deleted_at; we rely on API correctness
  }
}
