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

export async function test_api_article_attachment_authorization_author_only(
  connection: api.IConnection,
): Promise<void> {
  // Create Member A (article owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // Create article as Member A
  const article = await generate_random_discussion_board_member_articles_create(
    memberAConnection,
    {},
  );
  typia.assert(article);
  // Create Member B (different member)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Test: Member B attempts to add attachment to Member A's article (should fail with 403)
  const attachmentData = {
    type: "file" as const,
    name: "test-document.pdf",
    extension: "pdf",
    size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleAttachment.ICreate;
  await TestValidator.httpError(
    "Member B cannot add attachment to Member A's article",
    403,
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.create(
        memberBConnection,
        {
          articleId: article.id,
          body: attachmentData,
        },
      );
    },
  );
  // Test: Member A (article author) adds attachment to own article (should succeed)
  const attachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      memberAConnection,
      {
        articleId: article.id,
        body: attachmentData,
      },
    );
  typia.assert(attachment);
  // Verify attachment properties
  TestValidator.equals("attachment type", attachment.type, attachmentData.type);
  TestValidator.equals("attachment name", attachment.name, attachmentData.name);
  TestValidator.equals(
    "attachment extension",
    attachment.extension,
    attachmentData.extension,
  );
  TestValidator.equals("attachment size", attachment.size, attachmentData.size);
}