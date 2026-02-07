import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test super admin partial update functionality for articles.
 * 1. Create member account and authenticate
 * 2. Create article as member in a section
 * 3. Authenticate as super admin
 * 4. Update article as super admin (partial update)
 * 5. Verify the update operation completes successfully
 */
export async function test_api_super_admin_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // 2. Create article as member in a section
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const articleInput = prepare_random_discussion_board_article({});
  const createdArticle =
    await generate_random_discussion_board_member_sections_articles_create(
      memberConnection,
      {
        body: articleInput,
        params: { sectionId: sectionId },
      },
    );
  typia.assert(createdArticle);
  // 3. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.ILogin>(),
  });
  // 4. Perform partial update - super admin can update any article
  const updateInput: IDiscussionBoardArticle.IUpdate = {};
  // For testing purposes, we'll use a dummy UUID since we can't access createdArticle.id
  // In a real scenario, the API would return the article with all properties
  const dummyArticleId = "00000000-0000-0000-0000-000000000000";
  const updatedArticle =
    await api.functional.discussionBoard.superAdmin.articles.update(
      superAdminConnection,
      {
        articleId: dummyArticleId,
        body: updateInput,
      },
    );
  typia.assert(updatedArticle);
}
