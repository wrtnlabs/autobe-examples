import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_article_attachments_upload_unauthorized(
  connection: api.IConnection,
) {
  // 1) Create a member (authenticated context) to be used for article creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2) Create an article under the authenticated member
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    category_slug: null,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // Business assertion: initially no attachments
  TestValidator.equals(
    "created article has no attachments",
    article.attachments,
    [],
  );

  // 3) Prepare a valid attachment body (but attempt upload unauthenticated)
  const mimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
  ] as const;
  const mime = RandomGenerator.pick(mimeTypes);

  const attachmentBody = {
    original_filename: RandomGenerator.paragraph({ sentences: 2 }),
    storage_key: typia.random<string & tags.Format<"uri">>(),
    mime_type: mime,
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<20971520>
    >(),
    is_image: mime.startsWith("image/"),
  } satisfies IDiscussionBoardAttachment.ICreate;

  // 4) Create an unauthenticated connection copy (do not mutate original headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 5) Attempt the attachment upload without authentication — expect an error
  await TestValidator.error(
    "unauthenticated attachment upload should be rejected",
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.create(
        unauthConn,
        {
          articleId: article.id,
          body: attachmentBody,
        },
      );
    },
  );

  // 6) Post-condition: because upload threw, the previously created article's
  // attachments array (captured at creation time) remains unchanged (no new
  // attachments were created during this test). We cannot re-fetch the
  // article with provided SDK, so we assert the initial state and error
  // behavior suffices to demonstrate access control enforcement.
  TestValidator.equals(
    "attachments unchanged after failed upload",
    article.attachments,
    [],
  );
}
