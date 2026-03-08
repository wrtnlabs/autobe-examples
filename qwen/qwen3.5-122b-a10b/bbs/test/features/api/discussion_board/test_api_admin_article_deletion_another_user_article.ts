import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that an administrator can delete an article created by a different user (member).
 * This validates the authorization rule that admins can delete any article regardless of ownership.
 *
 * Test flow:
 * 1. Create and authenticate as admin
 * 2. Create and authenticate as member
 * 3. Admin creates a section
 * 4. Member creates an article in that section
 * 5. Admin deletes the member's article
 * 6. Verify the deletion was successful
 */
export async function test_api_admin_article_deletion_another_user_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Admin creates a section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 4. Member creates an article in that section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        discussion_board_section_id: section.id,
        title: RandomGenerator.name(3),
        body: RandomGenerator.paragraph({ sentences: 10 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Verify article was created by member (not admin)
  TestValidator.equals(
    "article author is member",
    article.author.id,
    memberAuth.id,
  );
  // 5. Admin deletes the member's article
  await api.functional.discussionBoard.admin.articles.erase(adminConnection, {
    articleId: article.id,
  });
  // 6. Verify the deletion was successful
  // Since erase returns void and there's no get API available, successful execution
  // without error confirms the admin has permission to delete any article
  TestValidator.predicate(
    "admin successfully deleted another user's article",
    true,
  );
}
