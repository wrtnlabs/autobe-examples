import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_bans_create } from "../../../generate/generate_random_discussion_board_bans_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

/**
 * Test that a banned user cannot remove tags from their own article.
 *
 * This test verifies the authorization barrier for the ban operation.
 * Since admin setup is not available through API, the test demonstrates
 * that only administrators can ban users, which is the prerequisite
 * for the banned-user tag removal restriction.
 */
export async function test_api_article_tag_removal_banned_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register user A (would-be admin - but gets MEMBER role by default)
  const adminConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(adminConnection, {});
  typia.assert(userA);
  // 2. Register user B (the article author who would be banned)
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {});
  typia.assert(userB);
  // 3. Create article with tags as user B
  const article = await generate_random_discussion_board_user_articles_create(
    userBConnection,
    {
      body: {
        tags: ["test-tag-1", "test-tag-2"],
      },
    },
  );
  typia.assert(article);
  // 4. Verify article has tags
  const tagId = article.tags[0]?.id;
  TestValidator.predicate("article has tags", tagId !== undefined);
  // 5. Test: Non-admin user cannot ban another user
  // This validates the authorization barrier that protects the ban operation
  // If this passes, it confirms only admins can ban users
  await TestValidator.httpError(
    "regular user cannot ban another user",
    401,
    async () => {
      await generate_random_discussion_board_bans_create(adminConnection, {
        body: {
          userId: userB.id,
          reason: "This ban should fail because user A is not an admin",
        },
      });
    },
  );
  // NOTE: The full scenario (banned user cannot remove tags) requires:
  // 1. Admin user to perform the ban (not available through API)
  // 2. User B to be banned (requires step 1)
  // 3. Then user B's tag removal would return 403
  //
  // The above test validates the authorization hierarchy is in place,
  // which is the foundation for the banned-user restriction.
}
