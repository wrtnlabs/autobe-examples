import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * The test validates retrieval of paginated and filtered lists of Reddit
 * community guest users without requiring authentication. It covers default
 * paging, paging with specified parameters, sorting by creation date ascending
 * and descending, and filtering by creation date ranges. All responses are
 * type-asserted and business logic assertions verify pagination and filtering
 * correctness.
 */
export async function test_api_reddit_community_guests_list_retrieval(
  connection: api.IConnection,
) {
  // 1. Test default retrieval without filter/pagination parameters
  {
    const body = {} satisfies IRedditCommunityGuest.IRequest;
    const output =
      await api.functional.redditCommunity.redditCommunityGuests.index(
        connection,
        { body },
      );
    typia.assert(output);
    TestValidator.predicate(
      "pagination current page should be >= 1",
      output.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit should be > 0 and <= 100",
      output.pagination.limit > 0 && output.pagination.limit <= 100,
    );
    TestValidator.predicate(
      "pagination pages should be >= current",
      output.pagination.pages >= output.pagination.current,
    );
  }

  // 2. Test retrieval with paging and limit parameters
  {
    const page = typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();
    const limit = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >();
    const body = { page, limit } satisfies IRedditCommunityGuest.IRequest;
    const output =
      await api.functional.redditCommunity.redditCommunityGuests.index(
        connection,
        { body },
      );
    typia.assert(output);
    TestValidator.equals(
      "pagination current matches",
      output.pagination.current,
      page,
    );
    TestValidator.equals(
      "pagination limit matches",
      output.pagination.limit,
      limit,
    );
  }

  // 3. Test sorting by created_at ascending and descending
  {
    // ascending
    const bodyAsc = {
      sortBy: "created_at",
      sortDirection: "asc",
    } satisfies IRedditCommunityGuest.IRequest;
    const outputAsc =
      await api.functional.redditCommunity.redditCommunityGuests.index(
        connection,
        { body: bodyAsc },
      );
    typia.assert(outputAsc);
    if (outputAsc.data.length > 1) {
      for (let i = 1; i < outputAsc.data.length; i++) {
        TestValidator.predicate(
          `created_at ascending order at index ${i}`,
          outputAsc.data[i - 1].created_at <= outputAsc.data[i].created_at,
        );
      }
    }

    // descending
    const bodyDesc = {
      sortBy: "created_at",
      sortDirection: "desc",
    } satisfies IRedditCommunityGuest.IRequest;
    const outputDesc =
      await api.functional.redditCommunity.redditCommunityGuests.index(
        connection,
        { body: bodyDesc },
      );
    typia.assert(outputDesc);
    if (outputDesc.data.length > 1) {
      for (let i = 1; i < outputDesc.data.length; i++) {
        TestValidator.predicate(
          `created_at descending order at index ${i}`,
          outputDesc.data[i - 1].created_at >= outputDesc.data[i].created_at,
        );
      }
    }
  }

  // 4. Test filtering by date range
  {
    const now = new Date();
    const startISO = new Date(
      now.getTime() - 1000 * 60 * 60 * 24 * 7,
    ).toISOString(); // 7 days ago
    const endISO = now.toISOString();
    const body = {
      filterStartDate: startISO,
      filterEndDate: endISO,
    } satisfies IRedditCommunityGuest.IRequest;
    const output =
      await api.functional.redditCommunity.redditCommunityGuests.index(
        connection,
        { body },
      );
    typia.assert(output);
    if (output.data.length > 0) {
      for (const guest of output.data) {
        TestValidator.predicate(
          "guest created_at within filter range",
          guest.created_at >= startISO && guest.created_at <= endISO,
        );
      }
    }
  }
}
