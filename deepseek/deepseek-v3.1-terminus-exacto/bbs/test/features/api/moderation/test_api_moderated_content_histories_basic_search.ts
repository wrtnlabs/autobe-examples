import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratedContentHistory";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratedContentHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderated_content_histories_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using join
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Perform basic search without filters
  const searchRequest: IDiscussionBoardModeratedContentHistory.IRequest = {
    page: 1,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  };
  const searchResult =
    await api.functional.discussionBoard.admin.moderated_content_histories.index(
      adminConnection,
      { body: searchRequest },
    );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination object exists",
    typeof searchResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is 1",
    searchResult.pagination.current === 1,
  );
  TestValidator.equals(
    "limit matches request",
    searchResult.pagination.limit,
    searchRequest.limit!,
  );
  TestValidator.predicate(
    "total records is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.equals("data is array", Array.isArray(searchResult.data), true);
  TestValidator.predicate(
    "data length matches limit",
    searchResult.data.length <= searchRequest.limit!,
  );
  // Validate each moderation history summary
  for (const history of searchResult.data) {
    typia.assert(history);
    // Business logic validation only - no type validation
    TestValidator.predicate(
      "content type is valid",
      history.content_type === "article" || history.content_type === "comment",
    );
    TestValidator.predicate(
      "moderation action exists",
      history.moderation_action.length > 0,
    );
    TestValidator.predicate(
      "moderation reason exists",
      history.moderation_reason.length > 0,
    );
    // Validate content references based on content type
    if (history.content_type === "article") {
      TestValidator.predicate(
        "moderated article reference exists",
        history.moderated_article !== null,
      );
    } else if (history.content_type === "comment") {
      TestValidator.predicate(
        "moderated comment reference exists",
        history.moderated_comment !== null,
      );
    }
    // Validate moderator information
    const hasAdmin = history.moderator_admin !== null;
    const hasSuperAdmin = history.moderator_super_admin !== null;
    TestValidator.predicate(
      "has exactly one moderator type",
      hasAdmin !== hasSuperAdmin,
    );
  }
}