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

export async function test_api_article_attachment_file_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  typia.assert(article);
  // 3. Create a file attachment for the article
  const attachmentBody = {
    type: "file" as const,
    name: "research-paper.pdf",
    extension: "pdf",
    size: 1048576, // 1MB (within 20MB limit)
    url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleAttachment.ICreate;
  const attachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      memberConnection,
      {
        articleId: article.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);
  // 4. Validate attachment properties
  TestValidator.equals("attachment type", attachment.type, "file");
  TestValidator.equals(
    "attachment name",
    attachment.name,
    "research-paper.pdf",
  );
  TestValidator.equals("attachment extension", attachment.extension, "pdf");
  TestValidator.equals("attachment size", attachment.size, 1048576);
  TestValidator.predicate(
    "attachment id is valid UUID",
    attachment.id.length > 0,
  );
  TestValidator.predicate(
    "attachment created_at exists",
    attachment.created_at.length > 0,
  );
}
