import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationQueue";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationQueue";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_discussionboard_moderation_queue_article_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      href: `https://test.example.com/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://referrer.example.com/${RandomGenerator.alphaNumeric(8)}`,
      ip: null,
    },
  });
  typia.assert(member);
  // 2. Create a new article with valid title (min 50 characters) and content (min 50 characters)
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 10,
          wordMax: 20,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 25,
          wordMin: 4,
          wordMax: 8,
        }),
      },
    },
  );
  typia.assert(article);
  // 3. Switch to admin context for the moderation queue
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `test-admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 4. Verify that the new article appears in the moderation queue
  const moderationQueueItems =
    await api.functional.discussionBoard.admin.dashboard.admin.moderation.index(
      adminConnection,
    );
  typia.assert(moderationQueueItems);
  const articleInQueue = moderationQueueItems.data.some(
    (item) => item.articleSummary.id === article.id,
  );
  TestValidator.equals(
    "article should be in moderation queue",
    articleInQueue,
    true,
  );
  // 5. Verify that the article status is 'pending'
  const articleStatusInQueue = moderationQueueItems.data.find(
    (item) => item.articleSummary.id === article.id,
  )?.status;
  TestValidator.equals(
    "article status should be pending",
    articleStatusInQueue,
    "pending",
  );
}
