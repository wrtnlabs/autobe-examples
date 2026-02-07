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

export async function test_api_super_admin_update_any_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResult =
    await api.functional.discussionBoard.auth.member.join(memberConnection, {
      body: typia.random<IDiscussionBoardMember.IJoin>(),
    });
  typia.assert(memberJoinResult);
  // 2. Login as member
  const memberLoginResult =
    await api.functional.discussionBoard.auth.member.login(memberConnection, {
      body: typia.random<IDiscussionBoardMember.ILogin>(),
    });
  typia.assert(memberLoginResult);
  // 3. Create article as member
  const sectionId = typia.random<string>();
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId: sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
  // 4. Login as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminLoginResult =
    await api.functional.discussionBoard.auth.super_admin.login(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.ILogin>(),
      },
    );
  typia.assert(superAdminLoginResult);
  // 5. Update article as super admin
  const updatedArticle =
    await api.functional.discussionBoard.superAdmin.articles.update(
      superAdminConnection,
      {
        articleId: (article as any).id,
        body: typia.random<IDiscussionBoardArticle.IUpdate>(),
      },
    );
  typia.assert(updatedArticle);
  // 6. Validate the update
  TestValidator.equals("article ID preserved", (updatedArticle as any).id, (article as any).id);
}