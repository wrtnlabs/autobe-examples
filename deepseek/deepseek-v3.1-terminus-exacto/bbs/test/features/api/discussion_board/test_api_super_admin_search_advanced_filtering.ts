import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_tags_create } from "../../../generate/generate_random_discussion_board_member_articles_tags_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_super_admin_search_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Create sections
  const economySection =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Economy",
          description: "Economic discussions and analysis",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(economySection);
  const politicsSection =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Politics",
          description: "Political discussions and analysis",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(politicsSection);
  // Create articles with specific content
  const economicArticle1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Economic growth analysis 2024",
          body: "Analysis of economic growth trends and market indicators for 2024",
          discussion_board_section_id: economySection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(economicArticle1);
  const economicArticle2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Market trends and investment opportunities",
          body: "Current market trends and potential investment opportunities in emerging markets",
          discussion_board_section_id: economySection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(economicArticle2);
  const politicalArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Political landscape overview",
          body: "Comprehensive overview of the current political landscape and policy discussions",
          discussion_board_section_id: politicsSection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(politicalArticle);
  // Test 1: Search with text query only
  const searchResults1 =
    await api.functional.discussionBoard.superAdmin.search.index(
      superAdminConnection,
      {
        body: {
          search: "economic growth",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResults1);
  TestValidator.predicate(
    "search with text query returns results",
    searchResults1.data.length > 0,
  );
  // Test 2: Search with section filtering
  const searchResults2 =
    await api.functional.discussionBoard.superAdmin.search.index(
      superAdminConnection,
      {
        body: {
          search: "analysis",
          discussion_board_section_id: economySection.id,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResults2);
  TestValidator.predicate(
    "section-filtered search returns results",
    searchResults2.data.length > 0,
  );
  // Test 3: Search with pagination
  const searchResults3 =
    await api.functional.discussionBoard.superAdmin.search.index(
      superAdminConnection,
      {
        body: {
          search: "trends",
          limit: 1,
          page: 1,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResults3);
  TestValidator.equals(
    "pagination limit respected",
    searchResults3.data.length,
    1,
  );
  // Test 4: Search with no results expected
  const searchResults4 =
    await api.functional.discussionBoard.superAdmin.search.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistent keyword",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResults4);
  TestValidator.equals(
    "no results for nonexistent keyword",
    searchResults4.data.length,
    0,
  );
  // Test 5: Search with maximum limit
  const searchResults5 =
    await api.functional.discussionBoard.superAdmin.search.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResults5);
  TestValidator.predicate(
    "maximum limit search succeeds",
    searchResults5.data.length <= 100,
  );
  // Validate chronological ordering (newest first)
  if (searchResults1.data.length > 1) {
    const firstArticleDate = new Date(searchResults1.data[0].created_at);
    const secondArticleDate = new Date(searchResults1.data[1].created_at);
    TestValidator.predicate(
      "results ordered newest first",
      firstArticleDate >= secondArticleDate,
    );
  }
}
