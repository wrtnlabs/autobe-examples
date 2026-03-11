import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test access control and authorization requirements for the popular articles endpoint.
 * Verify that only authenticated administrators can access the endpoint and that
 * unauthorized users receive appropriate error responses. Test edge cases with
 * empty result sets, maximum pagination limits, and invalid filtering parameters.
 * Validate that the response structure matches the expected schema with proper
 * pagination metadata.
 */
export async function test_api_admin_popular_articles_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
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
  // Create test articles as member
  const articles = await ArrayUtil.asyncRepeat(3, async () => {
    return await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  });
  // Test unauthorized access as regular member (business logic error, not type error)
  await TestValidator.error("member unauthorized access", async () => {
    await api.functional.discussionBoard.admin.popular.index(memberConnection, {
      body: {
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  });
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test authorized access as administrator
  const popularArticles =
    await api.functional.discussionBoard.admin.popular.index(adminConnection, {
      body: {
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(popularArticles);
  // Test maximum pagination limit
  const maxLimitArticles =
    await api.functional.discussionBoard.admin.popular.index(adminConnection, {
      body: {
        limit: 100 satisfies number as number,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(maxLimitArticles);
  // Test empty result set with non-existent section
  const emptyResult = await api.functional.discussionBoard.admin.popular.index(
    adminConnection,
    {
      body: {
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Test search functionality
  const searchResult = await api.functional.discussionBoard.admin.popular.index(
    adminConnection,
    {
      body: {
        search: RandomGenerator.substring(articles[0]!.title),
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult);
}
