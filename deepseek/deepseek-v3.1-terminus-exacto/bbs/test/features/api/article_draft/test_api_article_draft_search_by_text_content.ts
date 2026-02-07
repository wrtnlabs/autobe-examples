import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleDraft";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_article_drafts_create } from "../../../generate/generate_random_discussion_board_user_article_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";

export async function test_api_article_draft_search_by_text_content(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create multiple drafts with specific keywords for search testing
  const draft1 =
    await generate_random_discussion_board_user_article_drafts_create(
      userConnection,
      {
        body: {
          draft_title:
            "Introduction to Artificial Intelligence and Machine Learning",
          draft_content:
            "Artificial Intelligence is transforming industries worldwide. Machine learning algorithms enable computers to learn from data and make intelligent decisions.",
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft1);
  const draft2 =
    await generate_random_discussion_board_user_article_drafts_create(
      userConnection,
      {
        body: {
          draft_title: "The Future of Machine Learning in Healthcare",
          draft_content:
            "Machine learning applications in healthcare are revolutionizing patient care and medical research.",
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft2);
  const draft3 =
    await generate_random_discussion_board_user_article_drafts_create(
      userConnection,
      {
        body: {
          draft_title:
            "Cloud Computing and Artificial Intelligence Integration",
          draft_content:
            "Cloud platforms provide scalable infrastructure for artificial intelligence workloads and machine learning model deployment.",
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft3);
  const draft4 =
    await generate_random_discussion_board_user_article_drafts_create(
      userConnection,
      {
        body: {
          draft_title: "Data Science Fundamentals",
          draft_content:
            "Data science combines statistics, programming, and domain knowledge to extract insights from data.",
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft4);
  // Test search for "Artificial Intelligence" - should match draft1 and draft3
  const searchResult1 =
    await api.functional.discussionBoard.user.article_drafts.index(
      userConnection,
      {
        body: {
          search: "Artificial Intelligence",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Validate search results contain expected drafts
  TestValidator.predicate(
    "search should return matching drafts",
    searchResult1.data.length >= 2,
  );
  const foundDraftIds = searchResult1.data.map((draft) => draft.id);
  TestValidator.predicate(
    "should include draft with AI in title",
    foundDraftIds.includes(draft1.id),
  );
  TestValidator.predicate(
    "should include draft with AI in content",
    foundDraftIds.includes(draft3.id),
  );
  // Test partial match search "Machine" - should match draft1, draft2, draft3
  const searchResult2 =
    await api.functional.discussionBoard.user.article_drafts.index(
      userConnection,
      {
        body: {
          search: "Machine",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.predicate(
    "partial search should return multiple matches",
    searchResult2.data.length >= 3,
  );
  const partialFoundIds = searchResult2.data.map((draft) => draft.id);
  TestValidator.predicate(
    "should include draft1 with Machine Learning",
    partialFoundIds.includes(draft1.id),
  );
  TestValidator.predicate(
    "should include draft2 with Machine Learning",
    partialFoundIds.includes(draft2.id),
  );
  TestValidator.predicate(
    "should include draft3 with machine learning",
    partialFoundIds.includes(draft3.id),
  );
  // Test search with no matches
  const searchResult3 =
    await api.functional.discussionBoard.user.article_drafts.index(
      userConnection,
      {
        body: {
          search: "NonExistentKeyword12345",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(searchResult3);
  TestValidator.equals(
    "search with no matches should return empty results",
    searchResult3.data.length,
    0,
  );
  // Test pagination with search
  const searchResult4 =
    await api.functional.discussionBoard.user.article_drafts.index(
      userConnection,
      {
        body: {
          search: "Learning",
          limit: 2,
          page: 1,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(searchResult4);
  TestValidator.equals(
    "pagination limit should be respected",
    searchResult4.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination metadata should be valid",
    searchResult4.pagination.limit === 2 &&
      searchResult4.pagination.current === 1 &&
      searchResult4.pagination.records >= 3 &&
      searchResult4.pagination.pages >= 2,
  );
  // Test empty search term (should return all drafts)
  const searchResult5 =
    await api.functional.discussionBoard.user.article_drafts.index(
      userConnection,
      {
        body: {
          search: "",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(searchResult5);
  TestValidator.predicate(
    "empty search should return all drafts",
    searchResult5.data.length >= 4,
  );
}
