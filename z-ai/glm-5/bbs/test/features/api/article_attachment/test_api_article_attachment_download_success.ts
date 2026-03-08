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

export async function test_api_article_attachment_download_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member
  const memberAuthorization = await authorize_member_join(connection, {});
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuthorization.token.access },
  };
  // 2. Create article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  // 3. Upload attachment to the article
  const attachmentInput = {
    type: "file" as const,
    name: "test-document.pdf",
    extension: "pdf",
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
    >(),
    url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleAttachment.ICreate;
  const attachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: attachmentInput,
      },
    );
  // 4. Retrieve attachment via download endpoint
  const retrieved =
    await api.functional.discussionBoard.articles.attachments.at(
      memberConnection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate attachment metadata
  TestValidator.equals("attachment ID", retrieved.id, attachment.id);
  TestValidator.equals("attachment type", retrieved.type, attachmentInput.type);
  TestValidator.equals("attachment name", retrieved.name, attachmentInput.name);
  TestValidator.equals(
    "attachment extension",
    retrieved.extension,
    attachmentInput.extension,
  );
  TestValidator.equals("attachment size", retrieved.size, attachmentInput.size);
}
