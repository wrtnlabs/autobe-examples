import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_discussion_board_section_listing_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Since the main scenario is retrieving the list of discussion board sections with default pagination and no filters,
  // and no authentication is required, we can use the base connection directly.
  // Call the index endpoint with an empty request body (default pagination, no filters).
  const response =
    await api.functional.discussionBoard.administrator.sections.index(
      connection,
      {
        body: {},
      },
    );
  // Validate the response structure and content.
  typia.assert(response);
  // pagination metadata checks
  const pagination = response.pagination;
  // Check that current page is 1 (default first page)
  TestValidator.equals("current page should be 1", pagination.current, 1);
  // Limit should be positive
  TestValidator.predicate("page limit positive", pagination.limit > 0);
  // records should be >= 0
  TestValidator.predicate("records non-negative", pagination.records >= 0);
  // pages should be >= 0
  TestValidator.predicate("pages non-negative", pagination.pages >= 0);
  // pages should be consistent with records and limit (pages = Math.ceil(records / limit))
  TestValidator.equals(
    "pages calculation consistent",
    pagination.pages,
    Math.ceil(pagination.records / pagination.limit),
  );
  // section summaries in data
  for (const section of response.data) {
    typia.assert(section); // Validate structure
    // The soft-deleted sections should NOT be present (deleted_at must be null or absent)
    // Since deleted_at is part of properties of IDiscussionBoardSection.ISummary,
    // check that deleted_at is null or undefined.
    if ("deleted_at" in section) {
      TestValidator.equals(
        "section deleted_at is null",
        section.deleted_at,
        null,
      );
    }
  }
}
