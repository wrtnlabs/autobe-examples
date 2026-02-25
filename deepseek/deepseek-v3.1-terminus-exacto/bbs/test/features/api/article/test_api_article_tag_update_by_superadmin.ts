import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTag";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_tag_update_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin using utility function
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // Create an article as prerequisite
  const article =
    await api.functional.discussionBoard.superAdmin.articles.create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Generate 3-5 distinct tags meeting 1-50 character requirement
  const tags = ArrayUtil.repeat(RandomGenerator.pick([3, 4, 5] as const), () =>
    RandomGenerator.alphabets(
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<30>
      >(),
    ),
  );
  // Update tags on the article
  const tagResponse =
    await api.functional.discussionBoard.superAdmin.articles.tags.index(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          tags: tags,
        } satisfies IDiscussionBoardArticleTag.IRequest,
      },
    );
  typia.assert(tagResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof tagResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current",
    "current" in tagResponse.pagination,
  );
  TestValidator.predicate(
    "pagination has limit",
    "limit" in tagResponse.pagination,
  );
  TestValidator.predicate(
    "pagination has records",
    "records" in tagResponse.pagination,
  );
  TestValidator.predicate(
    "pagination has pages",
    "pages" in tagResponse.pagination,
  );
  // Validate data structure
  TestValidator.predicate("data is array", Array.isArray(tagResponse.data));
  // Validate each tag has correct structure
  tagResponse.data.forEach((tag, index) => {
    TestValidator.predicate(`tag ${index} has id`, !!tag.id);
    TestValidator.predicate(`tag ${index} has tag_name`, !!tag.tag_name);
    TestValidator.predicate(`tag ${index} has created_at`, !!tag.created_at);
    // Validate tag_name is properly normalized (trimmed, lowercase)
    TestValidator.equals(
      `tag ${index} name normalization`,
      tag.tag_name,
      tag.tag_name.trim().toLowerCase(),
    );
  });
  // Validate all requested tags are present in response (normalized)
  const normalizedRequestTags = tags.map((tag) => tag.trim().toLowerCase());
  const responseTagNames = tagResponse.data.map((tag) => tag.tag_name);
  normalizedRequestTags.forEach((requestTag) => {
    TestValidator.predicate(
      `tag \"${requestTag}\" should be present`,
      responseTagNames.includes(requestTag),
    );
  });
  // Validate no duplicates in response
  TestValidator.equals(
    "no duplicate tags",
    new Set(responseTagNames).size,
    responseTagNames.length,
  );
}
