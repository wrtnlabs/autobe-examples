import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test that banning a user preserves their existing content visibility per the content preservation policy.
 *
 * This test validates the critical business rule that when a member is banned:
 * 1. Their existing articles remain visible and accessible
 * 2. Their existing comments remain visible with author information intact
 * 3. The ban is successfully recorded with proper reason
 *
 * Workflow:
 * 1. Administrator authenticates
 * 2. Member account is created and authenticated
 * 3. Member creates an article with content
 * 4. Member creates a comment on their article
 * 5. Administrator bans the member
 * 6. Verify ban record is created successfully
 * 7. Verify article remains accessible with author information
 * 8. Verify comment remains accessible with author information
 */
export async function test_api_admin_ban_content_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create and login admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Member setup - create and login member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
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
  typia.assert(memberJoin);
  // 3. Member creates an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  typia.assert(article);
  // 4. Member creates a comment on their article
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Administrator bans the member
  const ban = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        member_id: memberJoin.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban);
  // 6. Verify ban record is created successfully
  TestValidator.equals("ban member matches", ban.member.id, memberJoin.id);
  TestValidator.predicate("ban has reason", ban.reason.length > 0);
  TestValidator.predicate("ban timestamp exists", ban.banned_at.length > 0);
  TestValidator.equals("ban admin exists", ban.admin.id, adminJoin.id);
  // 7. Verify article remains accessible with author information intact
  TestValidator.equals(
    "article author id matches",
    article.author.id,
    memberJoin.id,
  );
  TestValidator.equals(
    "article author display name preserved",
    article.author.display_name,
    memberJoin.display_name,
  );
  TestValidator.predicate(
    "article content preserved",
    article.content.length > 0,
  );
  TestValidator.predicate("article title preserved", article.title.length > 0);
  // 8. Verify comment remains accessible with author information intact
  TestValidator.equals(
    "comment author id matches",
    comment.author.id,
    memberJoin.id,
  );
  TestValidator.equals(
    "comment author display name preserved",
    comment.author.display_name,
    memberJoin.display_name,
  );
  TestValidator.predicate(
    "comment content preserved",
    comment.content.length > 0,
  );
  TestValidator.equals(
    "comment article matches",
    comment.article.id,
    article.id,
  );
}
