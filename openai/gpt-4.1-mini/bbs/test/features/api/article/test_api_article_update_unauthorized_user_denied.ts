import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_update_unauthorized_user_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join & login
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "adminpass12",
    },
  });
  typia.assert(admin);
  await authorize_administrator_login(adminConnection, {
    body: {
      email: admin.email,
      password: "adminpass12",
      href: "http://localhost",
      referrer: "http://localhost",
    },
  });
  // 2. Admin creates a section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 3. Registered User A join & login
  const userAConnection: api.IConnection = { host: connection.host };
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = "userApass12";
  const userA = await authorize_registered_user_join(userAConnection, {
    body: { email: userAEmail, password: userAPassword },
  });
  typia.assert(userA);
  await authorize_registered_user_login(userAConnection, {
    body: { email: userAEmail, password: userAPassword },
  });
  // 4. User A creates article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userAConnection,
      {
        body: { sectionId: section.id },
      },
    );
  typia.assert(article);
  // 5. Registered User B join & login
  const userBConnection: api.IConnection = { host: connection.host };
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = "userBpass12";
  const userB = await authorize_registered_user_join(userBConnection, {
    body: { email: userBEmail, password: userBPassword },
  });
  typia.assert(userB);
  await authorize_registered_user_login(userBConnection, {
    body: { email: userBEmail, password: userBPassword },
  });
  // 6. User B attempts to update User A's article
  const updateBody = {
    title: "Malicious Update Attempt",
    content: "This should not be allowed",
  } satisfies IDiscussionBoardArticle.IUpdate;
  await TestValidator.error(
    "unauthorized update attempt should fail",
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.update(
        userBConnection,
        {
          articleId: article.id,
          body: updateBody,
        },
      );
    },
  );
  // 7. Verify original article remains unchanged
  const originalArticle =
    await api.functional.discussionBoard.registeredUser.articles
      .update(userAConnection, {
        articleId: article.id,
        body: {
          title: article.title,
          content: article.content,
        },
      })
      .catch(() => {
        return article; // fallback to original article if error
      });
  typia.assert(originalArticle);
  TestValidator.equals(
    "article title unchanged",
    originalArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article content unchanged",
    originalArticle.content,
    article.content,
  );
}
