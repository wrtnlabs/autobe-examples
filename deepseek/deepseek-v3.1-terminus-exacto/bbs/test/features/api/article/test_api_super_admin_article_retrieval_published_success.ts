import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_super_admin_article_retrieval_published_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup for section creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create section using administrator
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Regular user setup for article creation
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 4. Create article by regular user
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }) as string &
      tags.MinLength<5> &
      tags.MaxLength<200>,
    content: RandomGenerator.paragraph({ sentences: 3 }) as string &
      tags.MinLength<50>,
    discussion_board_section_id: section.id,
  } satisfies IDiscussionBoardArticle.ICreate;
  const createdArticle =
    await api.functional.discussionBoard.user.articles.create(userConnection, {
      body: articleBody,
    });
  typia.assert(createdArticle);
  // 5. Super administrator setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 6. Retrieve article using super admin privileges
  const retrievedArticle =
    await api.functional.discussionBoard.superAdmin.articles.at(
      superAdminConnection,
      {
        articleId: createdArticle.id,
      },
    );
  typia.assert(retrievedArticle);
  // 7. Validate article details
  TestValidator.equals(
    "article id matches",
    retrievedArticle.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "article title matches",
    retrievedArticle.title,
    articleBody.title,
  );
  TestValidator.equals(
    "article content matches",
    retrievedArticle.content,
    articleBody.content,
  );
  TestValidator.predicate(
    "article has valid status",
    retrievedArticle.status === "published",
  );
  TestValidator.equals(
    "article author id matches",
    retrievedArticle.author.id,
    createdArticle.author.id,
  );
  TestValidator.equals(
    "article section id matches",
    retrievedArticle.section.id,
    section.id,
  );
  TestValidator.predicate(
    "article has creation timestamp",
    !!retrievedArticle.created_at,
  );
  TestValidator.predicate(
    "article has update timestamp",
    !!retrievedArticle.updated_at,
  );
  TestValidator.predicate(
    "article has valid author display name",
    !!retrievedArticle.author.display_name,
  );
  TestValidator.predicate(
    "article has valid section name",
    !!retrievedArticle.section.name,
  );
}
