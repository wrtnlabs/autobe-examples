import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_superadmin_add_multiple_tags_concurrently(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first super admin user using utility function
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  const superAdmin1: IDiscussionBoardSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdmin1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(superAdmin1);
  // 2. Create second super admin user using utility function
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2: IDiscussionBoardSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdmin2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(superAdmin2);
  // 3. Create section
  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdmin1Connection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(section);
  // 4. Create article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      superAdmin1Connection,
      {
        sectionId: section.id,
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.content({ paragraphs: 3 }),
        },
      },
    );
  typia.assert(article);
  // 5. Concurrently add tags from both super admins
  const tagRequest1 = {
    tags: [RandomGenerator.name(1), RandomGenerator.name(1)],
  } satisfies IDiscussionBoardArticle.ITagsRequest;
  const tagRequest2 = {
    tags: [RandomGenerator.name(1), RandomGenerator.name(1)],
  } satisfies IDiscussionBoardArticle.ITagsRequest;
  const response1 =
    await api.functional.discussionBoard.superAdmin.articles.tags.addTags(
      superAdmin1Connection,
      {
        articleId: article.id,
        body: tagRequest1,
      },
    );
  typia.assert(response1);
  const response2 =
    await api.functional.discussionBoard.superAdmin.articles.tags.addTags(
      superAdmin2Connection,
      {
        articleId: article.id,
        body: tagRequest2,
      },
    );
  typia.assert(response2);
  // 6. Validate responses
  TestValidator.equals(
    "first admin response status",
    response1.status,
    "success",
  );
  TestValidator.equals(
    "second admin response status",
    response2.status,
    "success",
  );
  TestValidator.predicate(
    "first admin added tags count",
    response1.tagsAdded >= tagRequest1.tags.length,
  );
  TestValidator.predicate(
    "second admin added tags count",
    response2.tagsAdded >= tagRequest2.tags.length,
  );
}
