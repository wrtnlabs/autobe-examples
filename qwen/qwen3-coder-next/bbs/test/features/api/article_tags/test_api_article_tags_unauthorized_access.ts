import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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
import { generate_random_discussion_board_member_articles_tags_create_tags } from "../../../generate/generate_random_discussion_board_member_articles_tags_create_tags";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_article_tags_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create unauthenticated connection (no authorization)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Attempt to add tags to an article without authentication
  // This should fail with a 401 or 403 error
  await TestValidator.error("unauthorized access to add tags", async () => {
    await api.functional.discussionBoard.member.articles.tags.createTags(
      unauthorizedConnection,
      {
        articleId: "123e4567-e89b-12d3-a456-426614174000",
        body: typia.random<IDiscussionBoardArticleTag.ICreate>(),
      },
    );
  });
}
