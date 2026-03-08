import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_member_article_file_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    },
  });
  typia.assert(member);
  // 2. Create an article using a placeholder section ID
  // NOTE: This test requires a valid section ID to exist in the system
  // In a real environment, you would first create a section via admin API
  // or use an existing section ID from the database
  const sectionId = "00000000-0000-0000-0000-000000000001";
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId: sectionId,
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Upload a file to the article
  const uploadedFile =
    await api.functional.discussionBoard.member.articles.files.create(
      memberConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(uploadedFile);
  // 4. Validate file metadata
  TestValidator.equals(
    "file name is not empty",
    uploadedFile.file_name.length > 0,
    true,
  );
  TestValidator.predicate(
    "file URL is valid URI",
    /^https?:\/\/.+/.test(uploadedFile.file_url),
  );
  TestValidator.predicate("file size is positive", uploadedFile.file_size > 0);
  TestValidator.equals(
    "file type is not empty",
    uploadedFile.file_type.length > 0,
    true,
  );
  TestValidator.predicate(
    "uploaded_at is valid ISO timestamp",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      uploadedFile.uploaded_at,
    ),
  );
  TestValidator.equals(
    "deleted_at is null for active files",
    uploadedFile.deleted_at,
    null,
  );
}
