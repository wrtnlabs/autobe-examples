import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPolDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPolDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPolDiscussionBoardGuest";

export async function test_api_econ_pol_discussion_board_guest_list_with_filters(
  connection: api.IConnection,
) {
  // 1. Test default page and limit
  const defaultResponse =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEconPolDiscussionBoardGuest.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default response has pagination",
    defaultResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "default response data is array",
    Array.isArray(defaultResponse.data),
  );

  // 2. Test pagination validity
  const totalRecords = defaultResponse.pagination.records;
  const pageSize = 5;
  const totalPages = Math.ceil(totalRecords / pageSize);

  for (let page = 1; page <= totalPages; page++) {
    const response =
      await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.index(
        connection,
        {
          body: {
            page,
            limit: pageSize,
          } satisfies IEconPolDiscussionBoardGuest.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      `pagination page matches response page ${page}`,
      response.pagination.current,
      page,
    );
    TestValidator.predicate(
      `response data length valid on page ${page}`,
      response.data.length <= pageSize,
    );
  }

  // 3. Test search filter by username substring (if any data exists)
  if (defaultResponse.data.length > 0) {
    const firstGuest = defaultResponse.data[0];
    // Use a substring of username
    const searchTerm = firstGuest.username.substring(
      0,
      Math.min(3, firstGuest.username.length),
    );
    const searchResponse =
      await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.index(
        connection,
        {
          body: {
            page: 1,
            limit: 20,
            search: searchTerm,
          } satisfies IEconPolDiscussionBoardGuest.IRequest,
        },
      );
    typia.assert(searchResponse);
    // Check every result username contains search term
    for (const guest of searchResponse.data) {
      TestValidator.predicate(
        `guest username contains search term`,
        guest.username.includes(searchTerm),
      );
    }
  }

  // 4. Test empty search term should behave same as no search
  const emptySearchResponse =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "",
        } satisfies IEconPolDiscussionBoardGuest.IRequest,
      },
    );
  typia.assert(emptySearchResponse);
  TestValidator.equals(
    "empty search same page size",
    emptySearchResponse.data.length,
    defaultResponse.data.length,
  );

  // 5. Test invalid pagination values gracefully handled (e.g. page 0)
  const invalidPageResponse =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.index(
      connection,
      {
        body: {
          page: 0,
          limit: 10,
        } satisfies IEconPolDiscussionBoardGuest.IRequest,
      },
    );
  typia.assert(invalidPageResponse);
  TestValidator.predicate(
    "invalid page returns empty or handles gracefully",
    invalidPageResponse.data.length === 0 ||
      invalidPageResponse.pagination.current === 0,
  );

  // 6. Test limit zero returns empty
  const zeroLimitResponse =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.index(
      connection,
      {
        body: {
          page: 1,
          limit: 0,
        } satisfies IEconPolDiscussionBoardGuest.IRequest,
      },
    );
  typia.assert(zeroLimitResponse);
  TestValidator.equals(
    "limit zero returns no data",
    zeroLimitResponse.data.length,
    0,
  );
}
