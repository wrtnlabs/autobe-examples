import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
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

export async function test_api_comment_list_chronological_ordering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin and section
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminLoginConnection,
    {},
  );
  typia.assert(section);
  // 2. Setup: Create member and article
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberAuth.email,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  const article = await generate_random_discussion_board_member_articles_create(
    memberLoginConnection,
    {
      body: {
        discussion_board_section_id: section.id,
        title: RandomGenerator.name(3),
        body: RandomGenerator.paragraph({ sentences: 10 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create multiple comments with delays to ensure different timestamps
  const comments: IDiscussionBoardComment[] = [];
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay between comments
    const comment =
      await generate_random_discussion_board_member_articles_comments_create(
        memberLoginConnection,
        {
          params: { articleId: article.id },
          body: {
            content: `Comment ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 4. Retrieve comments list and verify chronological ordering
  const commentList =
    await api.functional.discussionBoard.articles.comments.index(
      memberLoginConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(commentList);
  // 5. Validate chronological ordering (created_at ascending)
  TestValidator.predicate("comments sorted chronologically", () => {
    const data = commentList.data;
    for (let i = 1; i < data.length; i++) {
      if (data[i - 1].created_at > data[i].created_at) {
        return false;
      }
    }
    return true;
  });
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    commentList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", commentList.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records count positive",
    commentList.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    commentList.pagination.pages >= 1,
  );
}
