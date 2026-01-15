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
export async function test_api_mod_queue_retrieval_with_articles(
  connection: api.IConnection,
): Promise<void> {
  // Prepare admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com/dashboard",
      ip: "127.0.0.1",
    },
  });
  // Prepare member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: "member@example.com",
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com/home",
      ip: "127.0.0.1",
    },
  });
  // Member creates an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Admin retrieves moderation queue
  const queue =
    await api.functional.discussionBoard.admin.moderation.queues.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(queue);
  // Verify article appears in moderation queue
  const articleInQueue = queue.data.find(
    (item) => item.articleSummary.id === article.id,
  );
  TestValidator.equals(
    "article should be found in moderation queue",
    articleInQueue?.status,
    "pending",
  );
  TestValidator.equals(
    "article summary should match created article",
    articleInQueue?.articleSummary.title,
    article.title,
  );
}
