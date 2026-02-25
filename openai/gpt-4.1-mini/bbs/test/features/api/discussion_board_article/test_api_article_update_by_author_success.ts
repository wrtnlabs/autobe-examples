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

export async function test_api_article_update_by_author_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and gets authorized
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    },
  });
  typia.assert(admin);
  // 2. Administrator creates a section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: `Section_${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(section);
  // 3. Registered user joins and gets authorized
  const userConnection: api.IConnection = { host: connection.host };
  const userPassword = RandomGenerator.alphaNumeric(16);
  const userJoin = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: userPassword,
    },
  });
  typia.assert(userJoin);
  // 4. Registered user creates an article in the created section
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {
          sectionId: section.id,
        },
      },
    );
  typia.assert(article);
  // 5. Registered user updates the article title, content, and section assignment
  const updatedTitle = RandomGenerator.name(3);
  const updatedContent = RandomGenerator.content({ paragraphs: 2 });
  const updatedBody: IDiscussionBoardArticle.IUpdate = {
    title: updatedTitle,
    content: updatedContent,
    sectionId: section.id,
  };
  const updatedArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {
          sectionId: section.id,
        },
      },
    );
  const ret =
    await api.functional.discussionBoard.registeredUser.articles.update(
      userConnection,
      {
        articleId: article.id,
        body: updatedBody,
      },
    );
  typia.assert(ret);
  // Fix for section 'id' property assertion
  const sectionWithId = typia.assert<{
    id: string;
  } & object>(ret.section);
  // 6. Validate the updated article properties
  TestValidator.equals("updated title", ret.title, updatedTitle);
  TestValidator.equals("updated content", ret.content, updatedContent);
  TestValidator.equals("updated section ID", sectionWithId.id, section.id);
  TestValidator.equals("author id", ret.author.id, userJoin.id);
  // 7. Confirm that only the author can update using another user (registered user) - expect failure
  const anotherUserConnection: api.IConnection = { host: connection.host };
  const anotherUserPassword = RandomGenerator.alphaNumeric(16);
  const anotherUserJoin = await authorize_registered_user_join(
    anotherUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: anotherUserPassword,
      },
    },
  );
  typia.assert(anotherUserJoin);
  await authorize_registered_user_login(anotherUserConnection, {
    body: { email: anotherUserJoin.email, password: anotherUserPassword },
  });
  await TestValidator.error("unauthorized user update attempt", async () => {
    await api.functional.discussionBoard.registeredUser.articles.update(
      anotherUserConnection,
      {
        articleId: article.id,
        body: updatedBody,
      },
    );
  });
}
