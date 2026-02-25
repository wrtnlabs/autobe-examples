import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test comment update ownership validation across different user roles.
 */
export async function test_api_comment_update_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const commentOwnerConnection: api.IConnection = { host: connection.host };
  const differentUserConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Setup comment owner user account
  await authorize_user_join(commentOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 2. Setup different user account
  await authorize_user_join(differentUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. Setup admin account
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
  // 4. Admin creates section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 1,
          wordMax: 3,
        }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32">
        >() satisfies number as number,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 5. Admin creates article
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 6. Comment owner creates comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      commentOwnerConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment owned by correct user",
    comment.author.id,
    (commentOwnerConnection.headers as any).Authorization.replace(
      "Bearer ",
      "",
    ).split(".")[0],
  );
  // 7. Test: Comment owner can update their own comment (should succeed)
  const updatedComment =
    await api.functional.discussionBoard.admin.comments.update(
      commentOwnerConnection,
      {
        commentId: comment.id,
        body: {
          content:
            "Updated by owner: " + RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  TestValidator.equals(
    "comment content updated by owner",
    updatedComment.content.startsWith("Updated by owner:"),
    true,
  );
  TestValidator.equals(
    "comment ID remains the same",
    updatedComment.id,
    comment.id,
  );
  // 8. Test: Different user cannot update the comment (should throw error)
  await TestValidator.error("different user update forbidden", async () => {
    await api.functional.discussionBoard.admin.comments.update(
      differentUserConnection,
      {
        commentId: comment.id,
        body: {
          content:
            "Attempt by different user: " +
            RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  });
  // 9. Test: Admin cannot update user comment (should throw error)
  await TestValidator.error("admin cannot update user comment", async () => {
    await api.functional.discussionBoard.admin.comments.update(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          content:
            "Attempt by admin: " + RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  });
  // 10. Final validation: Comment owner can still update after failed attempts
  const finalComment =
    await api.functional.discussionBoard.admin.comments.update(
      commentOwnerConnection,
      {
        commentId: comment.id,
        body: {
          content:
            "Final update by owner: " +
            RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(finalComment);
  TestValidator.equals(
    "comment owner maintains update capability",
    finalComment.content.startsWith("Final update by owner:"),
    true,
  );
}
