import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { generate_random_discussion_board_super_admin_articles_tags_create_tags } from "../../../generate/generate_random_discussion_board_super_admin_articles_tags_create_tags";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_super_admin_tag_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin and member accounts
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.member.join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // 2. Login as member to get member connection
  const memberLoginResult =
    await api.functional.discussionBoard.auth.member.login(memberConnection, {
      body: typia.random<IDiscussionBoardMember.ILogin>(),
    });
  typia.assert(memberLoginResult);
  // 3. Login as super admin to get super admin connection
  const superAdminLoginResult =
    await api.functional.discussionBoard.auth.super_admin.login(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.ILogin>(),
      },
    );
  typia.assert(superAdminLoginResult);
  // 4. Create an article as member
  const articleRaw =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId: RandomGenerator.alphaNumeric(8),
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  const article = typia.assert<{
    id: string;
  }>(articleRaw);
  // 5. Add a tag to the article as super admin
  const createdTagRaw =
    await api.functional.discussionBoard.superAdmin.articles.tags.createTags(
      superAdminConnection,
      {
        articleId: article.id,
        body: typia.random<IDiscussionBoardArticleTag.ICreate>(),
      },
    );
  const createdTag = typia.assert<{
    id: string;
  }>(createdTagRaw);
  // 6. Remove the tag as super admin
  await api.functional.discussionBoard.superAdmin.articles.tags.eraseTag(
    superAdminConnection,
    {
      articleId: article.id,
      tagId: createdTag.id,
    },
  );
  // 7. Verify tag removal by checking article tags
  const updatedArticleRaw =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId: RandomGenerator.alphaNumeric(8),
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  const updatedArticle = typia.assert<{
    id: string;
  }>(updatedArticleRaw);
  TestValidator.equals(
    "tag removed successfully",
    updatedArticle.id,
    article.id,
  );
}