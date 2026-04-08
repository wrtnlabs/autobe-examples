import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModeratorSession";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test pagination behavior for moderator session listing with comprehensive metadata validation.
 *
 * Validates the complete pagination flow for moderator session retrieval, ensuring accurate page navigation, metadata consistency, and data integrity across multiple pages. Tests edge cases including beyond-boundary page requests and verifies default sorting behavior.
 *
 * Special attention is given to verifying pagination metadata accuracy: current page number, limit per page, total records count, and calculated total pages. The test ensures session records don't repeat across different pages and that empty data arrays are returned correctly when requesting pages beyond the total.
 *
 * 1. Authenticate as moderator with unique credentials.
 * 2. Request page 1 with limit 5 to verify first page returns correctly.
 * 3. Request page 2 to verify different session subset is returned.
 * 4. Validate pagination metadata: current, limit, records, pages are accurate.
 * 5. Request page beyond total pages to verify empty data with valid metadata.
 * 6. Confirm no duplicate session IDs across pages.
 * 7. Verify default sorting by created_at descending is maintained.
 */
export async function test_api_moderator_session_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Request page 1 with limit 5
  const page1 =
    await api.functional.redditClone.moderator.moderator.sessions.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IRedditCloneModeratorSession.IRequest,
      },
    );
  typia.assert(page1);
  // 3. Request page 2
  const page2 =
    await api.functional.redditClone.moderator.moderator.sessions.index(
      moderatorConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IRedditCloneModeratorSession.IRequest,
      },
    );
  typia.assert(page2);
  // 4. Validate pagination metadata for page 1
  TestValidator.equals("page 1 current is 1", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit is 5", page1.pagination.limit, 5);
  TestValidator.predicate("page 1 has data", page1.data.length > 0);
  // 5. Validate pagination metadata for page 2
  TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit is 5", page2.pagination.limit, 5);
  // 6. Verify records and pages are consistent
  TestValidator.equals(
    "page 1 and 2 have same total records",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.equals(
    "page 1 and 2 have same total pages",
    page1.pagination.pages,
    page2.pagination.pages,
  );
  // 7. Test edge case: request page beyond total
  const beyondPage = page1.pagination.pages + 1;
  const emptyPage =
    await api.functional.redditClone.moderator.moderator.sessions.index(
      moderatorConnection,
      {
        body: {
          page: beyondPage,
          limit: 5,
        } satisfies IRedditCloneModeratorSession.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "beyond page current matches request",
    emptyPage.pagination.current,
    beyondPage,
  );
  TestValidator.equals("beyond page has empty data", emptyPage.data.length, 0);
  TestValidator.equals(
    "beyond page has same total records",
    emptyPage.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "beyond page has same total pages",
    emptyPage.pagination.pages,
    page1.pagination.pages,
  );
  // 8. Verify no duplicate session IDs across pages
  const page1Ids = page1.data.map((s) => s.id);
  const page2Ids = page2.data.map((s) => s.id);
  const duplicates = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals("no duplicate session IDs", duplicates.length, 0);
  // 9. Verify default sorting by created_at descending
  TestValidator.predicate("page 1 sessions sorted by created_at desc", () => {
    for (let i = 1; i < page1.data.length; i++) {
      if (
        new Date(page1.data[i - 1].created_at) <
        new Date(page1.data[i].created_at)
      ) {
        return false;
      }
    }
    return true;
  });
  // 10. Verify pages calculation is correct
  const expectedPages = Math.ceil(
    page1.pagination.records / page1.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation is correct",
    page1.pagination.pages,
    expectedPages,
  );
}
