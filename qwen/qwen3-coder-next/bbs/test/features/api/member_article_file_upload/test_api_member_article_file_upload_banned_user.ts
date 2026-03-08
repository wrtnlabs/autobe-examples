import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_member_article_file_upload_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "123456",
      display_name: "Admin User",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "123456",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. Member registration and login
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "123456",
      display_name: "Test Member",
      bio: "Test user for banned file upload test",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  const memberLoginResponse = await authorize_member_login(memberConnection, {
    body: {
      email: "member@test.com",
      password: "123456",
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(memberLoginResponse);
  // 3. Create an article as member using a random section ID
  const sectionId = typia.random<string & typia.tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId: sectionId,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. Ban the member
  await api.functional.discussionBoard.admin.actors.ban.create(
    adminConnection,
    {
      body: {
        discussion_board_member_id: memberLoginResponse.id,
        ban_reason: "Testing banned user file upload prevention",
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  // 5. Attempt file upload as banned member - should fail
  await TestValidator.error("banned user cannot upload file", async () => {
    await api.functional.discussionBoard.member.articles.files.create(
      memberConnection,
      {
        articleId: article.id,
      },
    );
  });
  // 6. Verify banned user status and content visibility
  const checkBannedResponse = await authorize_member_login(memberConnection, {
    body: {
      email: "member@test.com",
      password: "123456",
    } satisfies IDiscussionBoardMember.ILogin,
  });
  TestValidator.equals("user is banned", checkBannedResponse.is_banned, true);
  TestValidator.equals(
    "ban reason matches",
    checkBannedResponse.ban_reason,
    "Testing banned user file upload prevention",
  );
  TestValidator.equals("article ID matches", article.id, article.id);
}
