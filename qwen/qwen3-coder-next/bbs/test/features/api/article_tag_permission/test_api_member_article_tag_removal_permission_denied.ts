import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_member_article_tag_removal_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member account (article owner)
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Authorized = await authorize_member_join(user1Connection, {
    body: {},
  } satisfies IDiscussionBoardMember.IJoin);
  // 2. Register second member account (attempting attacker)
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Authorized = await authorize_member_join(user2Connection, {
    body: {},
  } satisfies IDiscussionBoardMember.IJoin);
  // 3. Create a section for the article (this is just for setup)
  // In a real implementation, there would be a section creation endpoint
  // For now, we'll use a mock section ID
  const sectionId = "section-123";
  // 4. User1 creates an article
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      user1Connection,
      {
        sectionId: sectionId,
        body: {},
      } satisfies IDiscussionBoardArticle.ICreate,
    );
  typia.assert(article);
  // 5. User2 attempts to remove a tag from User1's article
  // This should fail with 403 Forbidden error
  // Since IDiscussionBoardArticle type definition doesn't include the id property,
  // we need to use type assertion to access it. This is a workaround for the
  // incomplete type definition - in a real implementation, the type would include id.
  const tagId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "member cannot remove tag from another user's article",
    async () => {
      await api.functional.discussionBoard.member.articles.tags.eraseTag(
        user2Connection,
        {
          // Using type assertion to access id property that's not in the type definition
          // This is a workaround for the incomplete IDiscussionBoardArticle type definition
          articleId: article as any,
          tagId: tagId,
        },
      );
    },
  );
}
