import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_files_upload } from "../../../generate/generate_random_discussion_board_member_articles_files_upload";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_discussion_board_member_file_attachment_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = typia.random<IDiscussionBoardMember.IJoin>();
  const memberAuthorized =
    await api.functional.discussionBoard.auth.member.join(memberConnection, {
      body: memberCredentials,
    });
  typia.assert(memberAuthorized);
  // Create new connection with authorization token
  const authenticatedMemberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuthorized.token.access,
    },
  };
  // 2. Create an article to attach files to
  // First create a dummy article to have a valid articleId
  const article =
    await api.functional.discussionBoard.member.articles.files.upload(
      authenticatedMemberConnection,
      {
        articleId: "dummy-article-id",
        body: typia.random<IDiscussionBoardArticleFile.ICreate>(),
      },
    );
  typia.assert(article);
  // 3. Upload a file attachment to the article
  const fileAttachment =
    await api.functional.discussionBoard.member.articles.files.upload(
      authenticatedMemberConnection,
      {
        articleId: (article as any).id,
        body: typia.random<IDiscussionBoardArticleFile.ICreate>(),
      },
    );
  typia.assert(fileAttachment);
  // 4. Delete the file attachment
  const deletedFile =
    await api.functional.discussionBoard.member.articles.files.erase(
      authenticatedMemberConnection,
      {
        articleId: (fileAttachment as any).id,
        fileId: (fileAttachment as any).id,
      },
    );
  typia.assert(deletedFile);
  // 5. Verify the file metadata is preserved ( soft delete )
  TestValidator.equals("file ID preserved", (deletedFile as any).id, (fileAttachment as any).id);
  TestValidator.predicate("file has timestamp", !!(deletedFile as any).deleted_at);
}