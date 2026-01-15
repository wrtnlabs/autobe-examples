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
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_files_post_by_articlecode } from "../../../generate/generate_random_discussion_board_member_articles_files_post_by_articlecode";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_article_file_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create member account and login
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
    },
  });
  // Create an article as member
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  typia.assert(article); // Fixed: Removed string argument
  // Attach a file to the article as member
  const file =
    await generate_random_discussion_board_member_articles_files_post_by_articlecode(
      memberConnection,
      {
        body: {
          mime_type: "application/pdf",
          size: 1024,
          name: "report.pdf",
          uri: `https://example.com/files/${RandomGenerator.alphaNumeric(10)}.pdf`,
          extension: "pdf",
        } satisfies IDiscussionBoardArticleFile.ICreate,
        params: {
          articleCode: article.code,
        },
      },
    );
  typia.assert(file); // Fixed: Removed string argument
  // Create admin account and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
    },
  });
  // Delete the file as admin
  await api.functional.discussionBoard.admin.articles.files.eraseByArticleidAndFileid(
    adminConnection,
    {
      articleId: article.id,
      fileId: file.id,
    },
  );
}