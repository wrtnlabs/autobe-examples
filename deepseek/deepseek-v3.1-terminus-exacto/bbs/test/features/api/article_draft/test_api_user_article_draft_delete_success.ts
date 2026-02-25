import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_drafts_create } from "../../../generate/generate_random_discussion_board_user_articles_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";

export async function test_api_user_article_draft_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create a draft article
  const draft =
    await generate_random_discussion_board_user_articles_drafts_create(
      userConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
          draft_content: RandomGenerator.content({ paragraphs: 3 }),
          draft_status: "draft",
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft);
  // Delete the draft
  await api.functional.discussionBoard.user.article_drafts.erase(
    userConnection,
    {
      draftId: draft.id,
    },
  );
  // Verify deletion timestamp behavior by attempting to access the draft again
  // This would typically show that the draft exists but is soft-deleted
  // Since we don't have a get draft endpoint, we'll verify the operation completed successfully
  // Test that attempting to delete the same draft again fails
  await TestValidator.error("duplicate deletion should fail", async () => {
    await api.functional.discussionBoard.user.article_drafts.erase(
      userConnection,
      {
        draftId: draft.id,
      },
    );
  });
}
