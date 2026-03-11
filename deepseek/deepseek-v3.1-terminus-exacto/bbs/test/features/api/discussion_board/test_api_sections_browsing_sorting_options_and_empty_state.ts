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

export async function test_api_sections_browsing_sorting_options_and_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Test empty state scenario
  const emptyResponse =
    await api.functional.discussionBoard.guest.sections.index(guestConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(emptyResponse);
  // Validate empty state pagination metadata
  TestValidator.equals(
    "empty state current page",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals("empty state limit", emptyResponse.pagination.limit, 10);
  TestValidator.equals(
    "empty state records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals("empty state pages", emptyResponse.pagination.pages, 0);
  TestValidator.equals("empty state data length", emptyResponse.data.length, 0);
  // Test pagination beyond available data
  const beyondPageResponse =
    await api.functional.discussionBoard.guest.sections.index(guestConnection, {
      body: {
        page: 999,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(beyondPageResponse);
  // Validate pagination boundaries
  TestValidator.equals(
    "beyond page current page",
    beyondPageResponse.pagination.current,
    999,
  );
  TestValidator.equals(
    "beyond page limit",
    beyondPageResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "beyond page records",
    beyondPageResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "beyond page pages",
    beyondPageResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "beyond page data length",
    beyondPageResponse.data.length,
    0,
  );
  // Test all sorting options
  const sortingOptions = [
    "created_at:desc",
    "created_at:asc",
    "updated_at:desc",
    "updated_at:asc",
    "name:asc",
    "name:desc",
  ] as const;
  for (const sortOption of sortingOptions) {
    const sortedResponse =
      await api.functional.discussionBoard.guest.sections.index(
        guestConnection,
        {
          body: {
            sort: sortOption,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardSection.IRequest,
        },
      );
    typia.assert(sortedResponse);
    // Validate section summary structure for each sorting option
    for (const section of sortedResponse.data) {
      TestValidator.predicate("section has id", typeof section.id === "string");
      TestValidator.predicate(
        "section has name",
        typeof section.name === "string",
      );
      TestValidator.predicate(
        "section description is string or null",
        section.description === null || typeof section.description === "string",
      );
      TestValidator.predicate(
        "section has created_at",
        typeof section.created_at === "string",
      );
    }
  }
}
