import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";

export async function test_api_admin_comment_flag_invalid_relationships(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Note: Since sections must exist and be managed by administrators,
  // we assume there are existing sections in the system.
  // For testing purposes, we'll use random UUIDs that should represent existing sections.
  // In a real scenario, we would create sections first or use existing ones.
  // Create first article
  const article1 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);
  // Create second article
  const article2 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);
  // Add comment to first article
  const comment1 =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: { articleId: article1.id },
      },
    );
  typia.assert(comment1);
  // Add comment to second article
  const comment2 =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: { articleId: article2.id },
      },
    );
  typia.assert(comment2);
  // Flag comment from first article
  const flag = await generate_random_discussion_board_user_content_flags_create(
    userConnection,
    {
      body: {
        flag_reason: RandomGenerator.paragraph({ sentences: 2 }),
        flagged_comment_id: comment1.id,
      } satisfies IDiscussionBoardContentFlag.ICreate,
    },
  );
  typia.assert(flag);
  // Test 1: Valid flag retrieval should work
  const validFlag =
    await api.functional.discussionBoard.admin.articles.comments.flags.at(
      adminConnection,
      {
        articleId: article1.id,
        commentId: comment1.id,
        flagId: flag.id,
      },
    );
  typia.assert(validFlag);
  // Test 2: Invalid relationship - flag belongs to comment1 but using comment2's ID
  await TestValidator.error("flag doesn't belong to comment2", async () => {
    await api.functional.discussionBoard.admin.articles.comments.flags.at(
      adminConnection,
      {
        articleId: article1.id,
        commentId: comment2.id, // Wrong comment ID
        flagId: flag.id,
      },
    );
  });
  // Test 3: Invalid relationship - comment doesn't belong to article
  await TestValidator.error("comment2 doesn't belong to article1", async () => {
    await api.functional.discussionBoard.admin.articles.comments.flags.at(
      adminConnection,
      {
        articleId: article1.id,
        commentId: comment2.id, // comment2 belongs to article2
        flagId: flag.id,
      },
    );
  });
  // Test 4: Invalid relationship - non-existent flag ID
  await TestValidator.error("non-existent flag ID", async () => {
    await api.functional.discussionBoard.admin.articles.comments.flags.at(
      adminConnection,
      {
        articleId: article1.id,
        commentId: comment1.id,
        flagId: typia.random<string & tags.Format<"uuid">>(), // Random flag ID
      },
    );
  });
}
