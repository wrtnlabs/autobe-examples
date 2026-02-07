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
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_content_flag_comment_moderation_review(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create discussion section using SDK (no utility function available)
  const section =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Create comment author user account and authenticate
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create article
  const article = await generate_random_discussion_board_user_articles_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: section.id,
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create comment
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      authorConnection,
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
  // Create reporter user account and authenticate
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Submit content flag for the comment
  const flag = await generate_random_discussion_board_user_content_flags_create(
    reporterConnection,
    {
      body: {
        flag_reason: RandomGenerator.paragraph({ sentences: 2 }),
        flagged_comment_id: comment.id,
      } satisfies IDiscussionBoardContentFlag.ICreate,
    },
  );
  typia.assert(flag);
  // Retrieve the flag as super admin
  const retrievedFlag =
    await api.functional.discussionBoard.superAdmin.content_flags.at(
      superAdminConnection,
      {
        flagId: flag.id,
      },
    );
  typia.assert(retrievedFlag);
  // Validate flag details
  TestValidator.equals("flag ID matches", retrievedFlag.id, flag.id);
  TestValidator.equals(
    "flag reason matches",
    retrievedFlag.flag_reason,
    flag.flag_reason,
  );
  TestValidator.equals(
    "flag status is pending",
    retrievedFlag.status,
    "pending",
  );
  TestValidator.predicate(
    "resolution reason should be null",
    retrievedFlag.resolution_reason === null,
  );
  TestValidator.predicate(
    "resolved at should be null",
    retrievedFlag.resolved_at === null,
  );
  TestValidator.predicate(
    "reviewing admin should be null",
    retrievedFlag.reviewingAdmin === null,
  );
  // Validate flagged comment relationship
  TestValidator.predicate(
    "flagged comment should exist",
    retrievedFlag.flaggedComment !== null,
  );
  if (retrievedFlag.flaggedComment) {
    TestValidator.equals(
      "comment ID matches",
      retrievedFlag.flaggedComment.id,
      comment.id,
    );
    TestValidator.equals(
      "comment content matches",
      retrievedFlag.flaggedComment.content,
      comment.content,
    );
    TestValidator.equals(
      "comment author ID matches",
      retrievedFlag.flaggedComment.author.id,
      comment.author.id,
    );
  }
  // Validate reporter information
  TestValidator.equals(
    "reporter ID matches",
    retrievedFlag.reporter.id,
    flag.reporter.id,
  );
  // Validate flagged article should be null (since we flagged a comment, not an article)
  TestValidator.predicate(
    "flagged article should be null",
    retrievedFlag.flaggedArticle === null,
  );
}
