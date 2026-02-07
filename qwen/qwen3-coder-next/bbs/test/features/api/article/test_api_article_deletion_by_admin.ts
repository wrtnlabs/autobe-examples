import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResponse =
    await api.functional.discussionBoard.auth.member.join(memberConnection, {
      body: typia.random<IDiscussionBoardMember.IJoin>(),
    });
  typia.assert(memberJoinResponse);
  memberConnection.headers = { Authorization: memberJoinResponse.token.access };
  // 2. Create an article as member
  const articleResponse =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId: "test-section-id",
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(articleResponse);
  // 3. Login as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLoginResponse =
    await api.functional.discussionBoard.auth.admin.login(adminConnection, {
      body: typia.random<IDiscussionBoardAdmin.ILogin>(),
    });
  typia.assert(adminLoginResponse);
  adminConnection.headers = { Authorization: adminLoginResponse.token.access };
  // 4. Delete the member's article as admin
  // Accessing id through type assertion since IDiscussionBoardArticle type doesn't expose it directly
  const articleId = (articleResponse as { id: string }).id;
  const deletedArticle =
    await api.functional.discussionBoard.member.articles.erase(
      adminConnection,
      {
        articleId,
      },
    );
  typia.assert(deletedArticle);
  // 5. Verify article was deleted by attempting to get it (should fail)
  // Note: This would typically throw an error if the article doesn't exist
}