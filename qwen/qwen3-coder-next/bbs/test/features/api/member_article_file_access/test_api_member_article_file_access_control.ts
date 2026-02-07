import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
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

export async function test_api_member_article_file_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member registration and login
  const firstMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(firstMemberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // 2. Create article as first member
  const articleId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.discussionBoard.member.articles.files.upload(
    firstMemberConnection,
    {
      articleId: articleId,
      body: typia.random<IDiscussionBoardArticleFile.ICreate>(),
    },
  );
  // 3. Second member registration and login
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondMemberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // 4. Second member attempts to list files on first member's article
  // This should fail due to authorization restrictions
  await TestValidator.error(
    "Second member should not be able to access first member's article files",
    async () => {
      await api.functional.discussionBoard.member.articles.files.index(
        secondMemberConnection,
        {
          articleId: articleId,
        },
      );
    },
  );
}