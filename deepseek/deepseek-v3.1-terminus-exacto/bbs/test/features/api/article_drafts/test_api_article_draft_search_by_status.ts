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

export async function test_api_article_draft_search_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(user);
  // Create drafts with different statuses
  const drafts = await ArrayUtil.asyncRepeat(3, async (index) => {
    const statuses = ["draft", "published", "archived"] as const;
    const status = statuses[index % statuses.length];
    const draft =
      await generate_random_discussion_board_user_article_drafts_create(
        userConnection,
        {
          body: {
            draft_title: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 3,
              wordMax: 7,
            }),
            draft_content: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 3,
              sentenceMax: 5,
            }),
          },
        },
      );
    typia.assert(draft);
    return { draft, status };
  });
  // Test searching for each status
  for (const status of ["draft", "published", "archived"] as const) {
    const searchResult =
      await api.functional.discussionBoard.user.article_drafts.index(
        userConnection,
        {
          body: {
            draft_status: status,
            limit: 10,
            page: 1,
          },
        },
      );
    typia.assert(searchResult);
    // Validate pagination
    TestValidator.equals(
      `pagination for ${status} status`,
      searchResult.pagination.limit,
      10,
    );
    TestValidator.equals(
      `page for ${status} status`,
      searchResult.pagination.current,
      1,
    );
    // Validate that all returned drafts have the correct status
    for (const draftSummary of searchResult.data) {
      TestValidator.equals(
        `draft status should be ${status}`,
        draftSummary.draft_status,
        status,
      );
      TestValidator.predicate(
        `draft should have id`,
        draftSummary.id.length > 0,
      );
      TestValidator.predicate(
        `draft should have title`,
        draftSummary.draft_title.length > 0,
      );
      TestValidator.predicate(
        `draft should have last_saved_at`,
        draftSummary.last_saved_at.length > 0,
      );
      TestValidator.predicate(
        `draft should have draft_updated_at`,
        draftSummary.draft_updated_at.length > 0,
      );
    }
  }
  // Test search without status filter (should return all drafts)
  const allDraftsResult =
    await api.functional.discussionBoard.user.article_drafts.index(
      userConnection,
      {
        body: {
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(allDraftsResult);
  // Verify that the total number of drafts matches what we created
  TestValidator.equals(
    "total draft count",
    allDraftsResult.pagination.records,
    3,
  );
  TestValidator.equals("returned draft count", allDraftsResult.data.length, 3);
}
