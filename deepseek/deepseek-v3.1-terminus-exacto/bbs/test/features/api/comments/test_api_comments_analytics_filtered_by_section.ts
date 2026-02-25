import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleViewStatEvent";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_super_admin_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_comments_analytics_filtered_by_section(
  connection: api.IConnection,
): Promise<void> {
  // Setup super admin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create multiple sections
  const politicsSection =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: "Politics",
          description: "Discuss political topics",
          status: "active",
          display_order: 1,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(politicsSection);
  const economySection =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: "Economy",
          description: "Discuss economic topics",
          status: "active",
          display_order: 2,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(economySection);
  const currentAffairsSection =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: "Current Affairs",
          description: "Discuss current events",
          status: "active",
          display_order: 3,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(currentAffairsSection);
  // Create articles in each section
  const politicsArticle =
    await api.functional.discussionBoard.superAdmin.articles.create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: politicsSection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(politicsArticle);
  const economyArticle =
    await api.functional.discussionBoard.superAdmin.articles.create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: economySection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(economyArticle);
  const currentAffairsArticle =
    await api.functional.discussionBoard.superAdmin.articles.create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: currentAffairsSection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(currentAffairsArticle);
  // Create regular users who will post comments
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // Create varied comment activity across sections
  // Politics section: 3 comments
  const politicsComments = await ArrayUtil.asyncRepeat(3, async () => {
    const comment =
      await api.functional.discussionBoard.user.articles.comments.create(
        user1Connection,
        {
          articleId: politicsArticle.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    return comment;
  });
  // Economy section: 2 comments
  const economyComments = await ArrayUtil.asyncRepeat(2, async () => {
    const comment =
      await api.functional.discussionBoard.user.articles.comments.create(
        user2Connection,
        {
          articleId: economyArticle.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    return comment;
  });
  // Current Affairs section: 1 comment
  const currentAffairsComment =
    await api.functional.discussionBoard.user.articles.comments.create(
      user1Connection,
      {
        articleId: currentAffairsArticle.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(currentAffairsComment);
  // Test filtering by Politics section
  const politicsAnalytics =
    await api.functional.discussionBoard.superAdmin.comments.analytics.index(
      superAdminConnection,
      {
        body: {
          section_id: politicsSection.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(politicsAnalytics);
  // Validate only politics section articles are included
  TestValidator.predicate(
    "politics analytics should contain politics article",
    politicsAnalytics.data.some(
      (stat) => stat.article.id === politicsArticle.id,
    ),
  );
  TestValidator.predicate(
    "politics analytics should not contain economy article",
    !politicsAnalytics.data.some(
      (stat) => stat.article.id === economyArticle.id,
    ),
  );
  TestValidator.predicate(
    "politics analytics should not contain current affairs article",
    !politicsAnalytics.data.some(
      (stat) => stat.article.id === currentAffairsArticle.id,
    ),
  );
  // Test filtering by Economy section
  const economyAnalytics =
    await api.functional.discussionBoard.superAdmin.comments.analytics.index(
      superAdminConnection,
      {
        body: {
          section_id: economySection.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(economyAnalytics);
  // Validate only economy section articles are included
  TestValidator.predicate(
    "economy analytics should contain economy article",
    economyAnalytics.data.some((stat) => stat.article.id === economyArticle.id),
  );
  TestValidator.predicate(
    "economy analytics should not contain politics article",
    !economyAnalytics.data.some(
      (stat) => stat.article.id === politicsArticle.id,
    ),
  );
  // Test filtering by Current Affairs section
  const currentAffairsAnalytics =
    await api.functional.discussionBoard.superAdmin.comments.analytics.index(
      superAdminConnection,
      {
        body: {
          section_id: currentAffairsSection.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(currentAffairsAnalytics);
  // Validate only current affairs section articles are included
  TestValidator.predicate(
    "current affairs analytics should contain current affairs article",
    currentAffairsAnalytics.data.some(
      (stat) => stat.article.id === currentAffairsArticle.id,
    ),
  );
  // Test empty section filtering (non-existent section)
  const nonExistentAnalytics =
    await api.functional.discussionBoard.superAdmin.comments.analytics.index(
      superAdminConnection,
      {
        body: {
          section_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleViewStatEvent.IRequest,
      },
    );
  typia.assert(nonExistentAnalytics);
  // Empty section should return empty results
  TestValidator.predicate(
    "non-existent section should return empty analytics",
    nonExistentAnalytics.data.length === 0,
  );
}
