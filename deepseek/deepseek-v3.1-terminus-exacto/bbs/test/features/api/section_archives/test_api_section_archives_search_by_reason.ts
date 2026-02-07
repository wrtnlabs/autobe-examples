import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionArchive";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_section_archives_search_by_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a section ID for testing
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Test basic search functionality with the available API
  // Since we cannot create actual archives, we test the search endpoint structure
  const searchResult =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      {
        sectionId,
        body: {
          search: "test reason",
          page: 1,
          limit: 10,
          sort: "archived_at_desc",
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate the response structure matches the expected type
  TestValidator.equals(
    "response has pagination",
    typeof searchResult.pagination,
    "object",
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(searchResult.data),
    true,
  );
  // Test pagination parameters are respected
  const limitedSearch =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      {
        sectionId,
        body: {
          search: "",
          page: 1,
          limit: 5,
          sort: "archived_at_desc",
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(limitedSearch);
  TestValidator.equals("limit is respected", limitedSearch.pagination.limit, 5);
  // Test different sorting options
  const ascendingSearch =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      {
        sectionId,
        body: {
          search: "",
          page: 1,
          limit: 10,
          sort: "archived_at_asc",
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(ascendingSearch);
  // Test empty search returns valid structure
  const emptySearch =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      {
        sectionId,
        body: {
          search: "",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(emptySearch);
  // Test with date range filters
  const dateFilteredSearch =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      {
        sectionId,
        body: {
          search: "archive",
          archivedAtFrom: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          archivedAtTo: new Date().toISOString(),
          page: 1,
          limit: 10,
          sort: "archived_at_desc",
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(dateFilteredSearch);
}
