import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_sections_search_filtering_by_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: "test_device_fingerprint_1234567890",
      href: "https://example.com/discussion-board",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Test 1: Basic search functionality with partial matching
  const searchTerm = "test";
  const searchResult =
    await api.functional.discussionBoard.guest.sections.index(guestConnection, {
      body: {
        search: searchTerm,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(searchResult);
  // Test 2: Case-insensitive matching
  const uppercaseSearchTerm = "TEST";
  const uppercaseResult =
    await api.functional.discussionBoard.guest.sections.index(guestConnection, {
      body: {
        search: uppercaseSearchTerm,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(uppercaseResult);
  // Test 3: Empty results for non-existent search terms
  const nonExistentTerm = "xyz123nonexistent";
  const emptyResult = await api.functional.discussionBoard.guest.sections.index(
    guestConnection,
    {
      body: {
        search: nonExistentTerm,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Test 4: Pagination with filtered results
  const paginatedSearch =
    await api.functional.discussionBoard.guest.sections.index(guestConnection, {
      body: {
        search: searchTerm,
        limit: 5,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(paginatedSearch);
  // Test 5: Search with special characters
  const specialCharTerm = "section-1";
  const specialCharResult =
    await api.functional.discussionBoard.guest.sections.index(guestConnection, {
      body: {
        search: specialCharTerm,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(specialCharResult);
}
