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

export async function test_api_comment_update_content_length_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      display_name: "Admin User",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/login",
      ip: "127.0.0.1",
    },
  });
  // 2. Create section as admin
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(section);
  // 3. Create article as admin
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.paragraph({ sentences: 3 }),
        discussion_board_section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // 4. User setup
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResult = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      display_name: "Test User",
    },
  });
  typia.assert(userJoinResult);
  // 5. Create initial comment as user
  const initialComment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(initialComment);
  // 6. Test boundary cases - using admin connection for update
  // 6.1 Update with exactly 1 character (should succeed)
  const singleCharContent = "a";
  const singleCharUpdate =
    await api.functional.discussionBoard.admin.comments.update(
      adminConnection,
      {
        commentId: initialComment.id,
        body: {
          content: singleCharContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(singleCharUpdate);
  TestValidator.equals(
    "Single character update content",
    singleCharUpdate.content,
    singleCharContent,
  );
  TestValidator.predicate(
    "Updated timestamp should be later",
    new Date(singleCharUpdate.updated_at).getTime() >
      new Date(initialComment.updated_at).getTime(),
  );
  // 6.2 Update with exactly 1000 characters (should succeed)
  const maxLengthContent = RandomGenerator.alphabets(1000);
  const maxLengthUpdate =
    await api.functional.discussionBoard.admin.comments.update(
      adminConnection,
      {
        commentId: singleCharUpdate.id,
        body: {
          content: maxLengthContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(maxLengthUpdate);
  TestValidator.equals(
    "Maximum length update content",
    maxLengthUpdate.content,
    maxLengthContent,
  );
  TestValidator.equals(
    "Maximum length update length",
    maxLengthUpdate.content.length,
    1000,
  );
  // 6.3 Update with 0 characters (should fail)
  await TestValidator.error("Zero character update should fail", async () => {
    await api.functional.discussionBoard.admin.comments.update(
      adminConnection,
      {
        commentId: maxLengthUpdate.id,
        body: {
          content: "",
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  });
  // 6.4 Update with 1001 characters (should fail)
  const tooLongContent = RandomGenerator.alphabets(1001);
  await TestValidator.error("Exceed maximum length should fail", async () => {
    await api.functional.discussionBoard.admin.comments.update(
      adminConnection,
      {
        commentId: maxLengthUpdate.id,
        body: {
          content: tooLongContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  });
  // 7. Verify final comment remains unchanged after failed updates
  const finalComment =
    await api.functional.discussionBoard.admin.comments.update(
      adminConnection,
      {
        commentId: maxLengthUpdate.id,
        body: {
          content: maxLengthUpdate.content,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(finalComment);
  TestValidator.equals(
    "Comment content unchanged after failed updates",
    finalComment.content,
    maxLengthContent,
  );
}
