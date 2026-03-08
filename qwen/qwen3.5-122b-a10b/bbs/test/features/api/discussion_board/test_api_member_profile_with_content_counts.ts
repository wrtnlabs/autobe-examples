import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_member_profile_with_content_counts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Admin creates section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(1),
      },
    },
  );
  typia.assert(section);
  // 3. Create member and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberDisplayName = RandomGenerator.name();
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 4. Create member login credentials for later use
  const memberLoginAuth = await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  typia.assert(memberLoginAuth);
  // 5. Member creates 3 articles
  const articleCount = 3;
  const articles = await ArrayUtil.asyncRepeat(articleCount, async () => {
    const article =
      await generate_random_discussion_board_member_articles_create(
        memberConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            body: RandomGenerator.content({ paragraphs: 3 }),
            discussion_board_section_id: section.id,
          },
        },
      );
    typia.assert(article);
    return article;
  });
  // 6. Member creates 5 comments across the articles
  const commentCount = 5;
  const comments = await ArrayUtil.asyncRepeat(commentCount, async (index) => {
    const article = articles[index % articles.length];
    const comment =
      await generate_random_discussion_board_member_articles_comments_create(
        memberConnection,
        {
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          },
          params: {
            articleId: article.id,
          },
        },
      );
    typia.assert(comment);
    return comment;
  });
  // 7. View member profile and verify counts
  const profile = await api.functional.discussionBoard.members.at(connection, {
    memberId: memberAuth.id,
  });
  typia.assert(profile);
  // 8. Validate article and comment counts match
  TestValidator.equals(
    "article count matches",
    profile.articleCount,
    articleCount,
  );
  TestValidator.equals(
    "comment count matches",
    profile.commentCount,
    commentCount,
  );
}
