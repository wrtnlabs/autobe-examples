import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
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
import { generate_random_discussion_board_articles_files_create } from "../../../generate/generate_random_discussion_board_articles_files_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_file_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      passwordConfirmation: "1234",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Create article as member
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content(),
        section_id: "123e4567-e89b-12d3-a456-426614174000" as string &
          tags.Format<"uuid">,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Upload file to article
  const file = await api.functional.discussionBoard.articles.files.create(
    memberConnection,
    {
      articleId: article.id,
      body: {
        originalFilename: "test_file.txt",
        mimeType: "text/plain",
      } satisfies IDiscussionBoardArticleFile.ICreate,
    },
  );
  typia.assert(file);
  // 4. Delete file by owner
  await api.functional.discussionBoard.articles.files.erase(memberConnection, {
    articleId: article.id,
    fileId: file.id,
  });
  // 5. Verify file is deleted by checking that we cannot access it anymore
  await TestValidator.error("file should be deleted", async () => {
    await api.functional.discussionBoard.articles.files.erase(
      memberConnection,
      {
        articleId: article.id,
        fileId: file.id,
      },
    );
  });
}
