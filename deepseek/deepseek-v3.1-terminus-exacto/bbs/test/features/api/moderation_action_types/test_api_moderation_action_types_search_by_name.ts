import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationActionType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test searching moderation action types by name using text search.
 * An administrator authenticates and performs a text search for moderation action types
 * by partial name matching. Verify that the search returns relevant results based on
 * name and description fields, and that pagination works correctly with search results.
 */
export async function test_api_moderation_action_types_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Generate a search term
  const searchTerm = RandomGenerator.alphabets(3);
  // Search moderation action types with the generated term
  const searchResult =
    await api.functional.discussionBoard.admin.moderation_action_types.index(
      adminConnection,
      {
        body: {
          search: searchTerm,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    typeof searchResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page positive",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate("limit positive", searchResult.pagination.limit >= 0);
  TestValidator.predicate(
    "records count non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.equals("data is array", Array.isArray(searchResult.data), true);
  // If results are returned, validate they contain the search term
  if (searchResult.data.length > 0) {
    searchResult.data.forEach((actionType, index) => {
      TestValidator.predicate(
        `action type ${index} has valid id`,
        typeof actionType.id === "string" && actionType.id.length > 0,
      );
      TestValidator.predicate(
        `action type ${index} has valid code`,
        typeof actionType.code === "string" && actionType.code.length > 0,
      );
      TestValidator.predicate(
        `action type ${index} has valid name`,
        typeof actionType.name === "string" && actionType.name.length > 0,
      );
      TestValidator.predicate(
        `action type ${index} has valid is_active flag`,
        typeof actionType.is_active === "boolean",
      );
      // Check if the search term appears in name (category is optional)
      const containsSearchTerm = actionType.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      TestValidator.predicate(
        `action type ${index} contains search term in name`,
        containsSearchTerm,
      );
    });
  }
  // Test pagination by requesting a specific page
  const pageResult =
    await api.functional.discussionBoard.admin.moderation_action_types.index(
      adminConnection,
      {
        body: {
          search: searchTerm,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(pageResult);
  // Validate pagination consistency
  TestValidator.equals("page number", pageResult.pagination.current, 1);
  TestValidator.equals("limit value", pageResult.pagination.limit, 10);
}
