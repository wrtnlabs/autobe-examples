import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_deletion_impact_analysis_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Create article using member connection
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create comment on the article using member connection
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
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
  // Analyze deletion impact as super administrator
  const deletionImpact1 =
    await api.functional.discussionBoard.superAdmin.comments.deletion_impact.deletionImpact(
      superAdminConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(deletionImpact1);
  // Validate deletion impact response
  TestValidator.equals("comment exists", deletionImpact1.exists, true);
  TestValidator.equals(
    "comment eligible for deletion",
    deletionImpact1.eligible,
    true,
  );
  TestValidator.equals("no restrictions", deletionImpact1.restrictions, []);
  TestValidator.equals("zero dependencies", deletionImpact1.dependencyCount, 0);
  TestValidator.predicate(
    "has actionable message",
    deletionImpact1.message !== null &&
      deletionImpact1.message !== undefined &&
      deletionImpact1.message.length > 0,
  );
  // Test idempotency - make same call again
  const deletionImpact2 =
    await api.functional.discussionBoard.superAdmin.comments.deletion_impact.deletionImpact(
      superAdminConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(deletionImpact2);
  // Validate idempotency - responses should be identical
  TestValidator.equals(
    "idempotent exists",
    deletionImpact2.exists,
    deletionImpact1.exists,
  );
  TestValidator.equals(
    "idempotent eligible",
    deletionImpact2.eligible,
    deletionImpact1.eligible,
  );
  TestValidator.equals(
    "idempotent restrictions",
    deletionImpact2.restrictions,
    deletionImpact1.restrictions,
  );
  TestValidator.equals(
    "idempotent dependencyCount",
    deletionImpact2.dependencyCount,
    deletionImpact1.dependencyCount,
  );
  TestValidator.equals(
    "idempotent message",
    deletionImpact2.message,
    deletionImpact1.message,
  );
}
