import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentEditHistory";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_edit_history_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user session
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create an article to comment on
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1, sentenceMin: 5, sentenceMax: 5 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create the initial comment
  const initialComment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          content: "Initial comment content with technical keywords",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(initialComment);
  // Wait briefly before first edit to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Perform first edit
  const firstEditContent = "First edit with enhanced technical description";
  const firstEdit =
    await api.functional.discussionBoard.user.articles.comments.update(
      userConnection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: firstEditContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(firstEdit);
  const firstEditTime = new Date().toISOString();
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Perform second edit
  const secondEditContent = "Second edit with different keyword composition";
  const secondEdit =
    await api.functional.discussionBoard.user.articles.comments.update(
      userConnection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: secondEditContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(secondEdit);
  const secondEditTime = new Date().toISOString();
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Perform third edit
  const thirdEditContent =
    "Final edit including technical keywords and summary";
  const thirdEdit =
    await api.functional.discussionBoard.user.articles.comments.update(
      userConnection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: thirdEditContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(thirdEdit);
  const thirdEditTime = new Date().toISOString();
  // Test 1: Retrieve all edit histories without filters
  const allHistories =
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        commentId: initialComment.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(allHistories);
  TestValidator.equals(
    "should have 3 edit histories",
    allHistories.data.length,
    3,
  );
  // Test 2: Filter by edit sequence range (2-3)
  const sequenceFiltered =
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        commentId: initialComment.id,
        body: {
          edit_sequence_min: 2,
          edit_sequence_max: 3,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(sequenceFiltered);
  TestValidator.equals(
    "should have 2 histories in sequence 2-3",
    sequenceFiltered.data.length,
    2,
  );
  sequenceFiltered.data.forEach((history) => {
    TestValidator.predicate(
      "sequence within range",
      history.edit_sequence >= 2 && history.edit_sequence <= 3,
    );
  });
  // Test 3: Filter by single sequence number
  const singleSequence =
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        commentId: initialComment.id,
        body: {
          edit_sequence_min: 2,
          edit_sequence_max: 2,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(singleSequence);
  TestValidator.equals(
    "should have exactly 1 history for sequence 2",
    singleSequence.data.length,
    1,
  );
  TestValidator.equals(
    "should be sequence 2",
    singleSequence.data[0]!.edit_sequence,
    2,
  );
  // Test 4: Search by content keyword
  const keywordSearch =
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        commentId: initialComment.id,
        body: {
          search: "technical",
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(keywordSearch);
  TestValidator.predicate(
    "should find histories containing technical keyword",
    keywordSearch.data.length > 0,
  );
  keywordSearch.data.forEach((history) => {
    const foundInOriginal = history.original_content
      .toLowerCase()
      .includes("technical");
    const foundInEdited = history.edited_content
      .toLowerCase()
      .includes("technical");
    TestValidator.predicate(
      "keyword found in content",
      foundInOriginal || foundInEdited,
    );
  });
  // Test 5: Date range filtering (from first edit to third edit)
  const dateRangeSearch =
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        commentId: initialComment.id,
        body: {
          created_at_min: firstEditTime,
          created_at_max: thirdEditTime,
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(dateRangeSearch);
  TestValidator.predicate(
    "should find histories in date range",
    dateRangeSearch.data.length >= 2,
  );
  // Test 6: Combined filters (sequence + search)
  const combinedFilter =
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        commentId: initialComment.id,
        body: {
          edit_sequence_min: 1,
          edit_sequence_max: 2,
          search: "edit",
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(combinedFilter);
  combinedFilter.data.forEach((history) => {
    TestValidator.predicate(
      "sequence within range",
      history.edit_sequence >= 1 && history.edit_sequence <= 2,
    );
    const foundInOriginal = history.original_content
      .toLowerCase()
      .includes("edit");
    const foundInEdited = history.edited_content.toLowerCase().includes("edit");
    TestValidator.predicate(
      "search term found",
      foundInOriginal || foundInEdited,
    );
  });
  // Test 7: Empty result test (search for non-existent term)
  const emptySearch =
    await api.functional.discussionBoard.user.comments.edit_histories.index(
      userConnection,
      {
        commentId: initialComment.id,
        body: {
          search: "nonexistentkeyword12345",
        } satisfies IDiscussionBoardCommentEditHistory.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "should return empty results for non-existent keyword",
    emptySearch.data.length,
    0,
  );
}