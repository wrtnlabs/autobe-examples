import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_attachment } from "../../../prepare/prepare_random_discussion_board_article_attachment";

export async function test_api_article_attachment_cross_article_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create first article (Article A)
  const articleA =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {},
    );
  typia.assert(articleA);
  // 3. Create second article (Article B) - different article for cross-access test
  const articleB =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {},
    );
  typia.assert(articleB);
  // 4. Upload attachment to Article A (not Article B)
  const attachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        params: { articleId: articleA.id },
      },
    );
  typia.assert(attachment);
  // 5. Attempt to retrieve the attachment from Article A using Article B's ID
  // This should fail with 404 because the attachment belongs to Article A, not Article B
  await TestValidator.httpError(
    "cross-article attachment access denied",
    404,
    async () =>
      await api.functional.discussionBoard.articles.attachments.at(
        memberConnection,
        {
          articleId: articleB.id,
          attachmentId: attachment.id,
        },
      ),
  );
}
