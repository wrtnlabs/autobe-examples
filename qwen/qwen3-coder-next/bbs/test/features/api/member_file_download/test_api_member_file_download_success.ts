import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IString } from "@ORGANIZATION/PROJECT-api/lib/structures/IString";
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

export async function test_api_member_file_download_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection for authorization
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // 2. Generate random article and file IDs for download test
  // Note: IDiscussionBoardArticleFile DTO has no properties defined, so we generate random IDs
  const articleId = typia.random<string>();
  const fileId = typia.random<string>();
  // 3. Download the file and validate
  const uri: IString =
    await api.functional.discussionBoard.member.articles.files.download(
      memberConnection,
      {
        articleId: articleId,
        fileId: fileId,
      },
    );
  typia.assert(uri);
}
