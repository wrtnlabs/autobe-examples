import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdmin";
import type { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import type { IEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAttachment";
import type { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import type { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_economic_political_discussion_board_admin_sections_create } from "../../../generate/generate_random_economic_political_discussion_board_admin_sections_create";
import { generate_random_economic_political_discussion_board_user_articles_create } from "../../../generate/generate_random_economic_political_discussion_board_user_articles_create";
import { prepare_random_economic_political_discussion_board_article } from "../../../prepare/prepare_random_economic_political_discussion_board_article";
import { prepare_random_economic_political_discussion_board_attachment } from "../../../prepare/prepare_random_economic_political_discussion_board_attachment";
import { prepare_random_economic_political_discussion_board_section } from "../../../prepare/prepare_random_economic_political_discussion_board_section";

export async function test_api_article_creation_with_valid_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
    } satisfies IEconomicPoliticalDiscussionBoardAdmin.ILogin,
  });
  // 2. Admin creates section
  const section =
    await generate_random_economic_political_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name() + " Discussion",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEconomicPoliticalDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. User setup
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: userEmail,
      password: "password123",
      href: "https://test.com",
      referrer: "https://test.com",
      ip: undefined,
    } satisfies IEconomicPoliticalDiscussionBoardUser.IJoin,
  });
  // 4. User logs in
  const userLogin = await authorize_user_login(userConnection, {
    body: {
      email: userEmail,
      password: "password123",
    } satisfies IEconomicPoliticalDiscussionBoardUser.ILogin,
  });
  typia.assert(userLogin);
  // 5. Create article
  const article =
    await generate_random_economic_political_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 50,
          }),
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 10,
            wordMax: 20,
          }),
          section_id: section.id,
          attachments: [
            {
              url: "https://test.com/image.jpg",
              type: "image",
            } satisfies IEconomicPoliticalDiscussionBoardAttachment.ICreate,
          ],
        } satisfies IEconomicPoliticalDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 6. Validate
  TestValidator.equals("title matches input", article.title, article.title);
  TestValidator.predicate(
    "content length valid",
    article.content.length >= 200,
  );
  TestValidator.equals("section matches", article.section.id, section.id);
  TestValidator.equals("author matches", article.user.id, userLogin.user.id);
}