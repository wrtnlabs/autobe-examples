import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_content_flag_retrieval_with_comment_flag(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Create a section for the article
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
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
  // 3. Create and authenticate as reporter user
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuthorized = await authorize_user_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(reporterAuthorized);
  // 4. Create an article in the section
  const article = await generate_random_discussion_board_user_articles_create(
    reporterConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        section_id: section.id,
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Create a comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      reporterConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Create a content flag targeting the comment
  const contentFlag =
    await generate_random_discussion_board_user_content_flags_create(
      reporterConnection,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 2 }),
          flagged_comment_id: comment.id,
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(contentFlag);
  // 7. Retrieve the content flag via admin endpoint
  const retrievedFlag =
    await api.functional.discussionBoard.admin.content_flags.at(
      adminConnection,
      {
        flagId: contentFlag.id,
      },
    );
  typia.assert(retrievedFlag);
  // 8. Validate the content flag contains complete comment information
  TestValidator.equals(
    "content flag ID matches",
    retrievedFlag.id,
    contentFlag.id,
  );
  TestValidator.equals(
    "flag reason matches",
    retrievedFlag.flag_reason,
    contentFlag.flag_reason,
  );
  TestValidator.equals("status is pending", retrievedFlag.status, "pending");
  TestValidator.predicate(
    "resolved_at is null",
    retrievedFlag.resolved_at === null,
  );
  TestValidator.predicate(
    "resolution_reason is null",
    retrievedFlag.resolution_reason === null,
  );
  TestValidator.predicate(
    "reviewingAdmin is null",
    retrievedFlag.reviewingAdmin === null,
  );
  // Validate flagged comment relation
  TestValidator.predicate(
    "flaggedComment is populated",
    retrievedFlag.flaggedComment !== null,
  );
  const flaggedComment = retrievedFlag.flaggedComment!;
  TestValidator.equals("comment ID matches", flaggedComment.id, comment.id);
  TestValidator.equals(
    "comment content matches",
    flaggedComment.content,
    comment.content,
  );
  TestValidator.predicate(
    "comment created_at is valid",
    flaggedComment.created_at !== null,
  );
  // Validate comment author
  TestValidator.predicate(
    "comment author is populated",
    flaggedComment.author !== null,
  );
  TestValidator.equals(
    "author ID matches",
    flaggedComment.author.id,
    reporterAuthorized.id,
  );
  TestValidator.equals(
    "author display_name matches",
    flaggedComment.author.display_name,
    reporterAuthorized.display_name,
  );
  // Validate flagged article is null (since we flagged a comment)
  TestValidator.predicate(
    "flaggedArticle is null",
    retrievedFlag.flaggedArticle === null,
  );
  // Validate reporter information
  TestValidator.predicate(
    "reporter is populated",
    retrievedFlag.reporter !== null,
  );
  TestValidator.equals(
    "reporter ID matches",
    retrievedFlag.reporter.id,
    reporterAuthorized.id,
  );
  TestValidator.equals(
    "reporter display_name matches",
    retrievedFlag.reporter.display_name,
    reporterAuthorized.display_name,
  );
}
