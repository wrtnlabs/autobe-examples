import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_article_tags_validation_length(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // 2. Create a test section first (sections are required for articles)
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const articleId = typia.random<string & tags.Format<"uuid">>(); // Generate a fake article ID since the DTO doesn't include it
  // 3. Test minimum length validation (1 character tag - should fail)
  await TestValidator.error("minimum length validation", async () => {
    await generate_random_discussion_board_member_articles_tags_create_tags(
      memberConnection,
      {
        params: {
          articleId,
        },
        body: {
          tags: ["a"],
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  });
  // 4. Test maximum length validation (51 character tag - should fail)
  const longTag = "a".repeat(51);
  await TestValidator.error("maximum length validation", async () => {
    await generate_random_discussion_board_member_articles_tags_create_tags(
      memberConnection,
      {
        params: {
          articleId,
        },
        body: {
          tags: [longTag],
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  });
  // 5. Verify valid tags work (2 characters and 50 characters)
  const validShortTag = "ab";
  const result1 =
    await generate_random_discussion_board_member_articles_tags_create_tags(
      memberConnection,
      {
        params: {
          articleId,
        },
        body: {
          tags: [validShortTag],
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(result1);
  const validLongTag = "a".repeat(50);
  const result2 =
    await generate_random_discussion_board_member_articles_tags_create_tags(
      memberConnection,
      {
        params: {
          articleId,
        },
        body: {
          tags: [validLongTag],
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(result2);
}
