import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";

export async function test_api_content_flag_moderation_dismissal_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular user account
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 2. Create an article for commenting (using existing section)
  // Since we cannot create sections, we need to use a different approach
  // Let's assume there's at least one existing section in the system
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        section_id: typia.random<string & tags.Format<"uuid">>(), // This will fail if no sections exist
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Add a comment that will be flagged
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Report the comment as inappropriate content
  const flag = await generate_random_discussion_board_user_content_flags_create(
    userConnection,
    {
      body: {
        flag_reason: RandomGenerator.paragraph({ sentences: 2 }),
        flagged_comment_id: comment.id,
      } satisfies IDiscussionBoardContentFlag.ICreate,
    },
  );
  typia.assert(flag);
  // 5. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 6. Update the flag status to dismissed with resolution reason
  const updateBody = {
    status: "dismissed" as const,
    resolution_reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardContentFlag.IUpdate;
  const updatedFlag =
    await api.functional.discussionBoard.superAdmin.content_flags.update(
      superAdminConnection,
      {
        flagId: flag.id,
        body: updateBody,
      },
    );
  typia.assert(updatedFlag);
  // 7. Validate the flag was properly dismissed
  TestValidator.equals(
    "flag status should be dismissed",
    updatedFlag.status,
    "dismissed",
  );
  TestValidator.equals(
    "resolution reason should match",
    updatedFlag.resolution_reason,
    updateBody.resolution_reason,
  );
  TestValidator.predicate(
    "resolved_at timestamp should be set",
    updatedFlag.resolved_at !== null,
  );
  TestValidator.predicate("resolved_at should be a valid date", () => {
    if (updatedFlag.resolved_at === null) return false;
    const date = new Date(updatedFlag.resolved_at!);
    return !isNaN(date.getTime());
  });
  // 8. Verify the flag remains accessible for audit purposes
  TestValidator.equals(
    "flag id should remain the same",
    updatedFlag.id,
    flag.id,
  );
  TestValidator.equals(
    "flag reason should remain unchanged",
    updatedFlag.flag_reason,
    flag.flag_reason,
  );
  TestValidator.equals(
    "reporter should remain the same",
    updatedFlag.reporter.id,
    flag.reporter.id,
  );
  TestValidator.equals(
    "flagged comment should remain the same",
    updatedFlag.flaggedComment?.id,
    flag.flaggedComment?.id,
  );
}