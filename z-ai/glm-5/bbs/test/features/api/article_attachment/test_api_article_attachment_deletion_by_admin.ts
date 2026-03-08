import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_attachment } from "../../../prepare/prepare_random_discussion_board_article_attachment";

export async function test_api_article_attachment_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      displayName: RandomGenerator.name(),
    },
  });
  // 2. Member creates an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  typia.assert(article);
  // 3. Member uploads an attachment to the article
  const attachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(attachment);
  // 4. Admin authentication - create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  // 5. Administrator deletes the member's attachment
  // Success is indicated by no error being thrown (API returns void)
  await api.functional.discussionBoard.member.articles.attachments.erase(
    adminConnection,
    {
      articleId: article.id,
      attachmentId: attachment.id,
    },
  );
}
