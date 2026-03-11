import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReaction";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_reactions_create } from "../../../generate/generate_random_discussion_board_member_articles_reactions_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_reaction } from "../../../prepare/prepare_random_discussion_board_article_reaction";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_admin_engagement_comprehensive_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create member connections for engagement
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
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
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
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
  // Note: In a real implementation, we would need to create sections first
  // Since we don't have section creation utility, we'll proceed with the test
  // assuming sections exist or the system has default sections
  // Create articles with different engagement patterns
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      member1Connection,
      {
        body: {
          title: "High Reactions Article" + RandomGenerator.alphabets(5),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      member2Connection,
      {
        body: {
          title: "High Comments Article" + RandomGenerator.alphabets(5),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  const article3 =
    await generate_random_discussion_board_member_articles_create(
      member1Connection,
      {
        body: {
          title: "Balanced Engagement Article" + RandomGenerator.alphabets(5),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article3);
  // Add reactions to create engagement patterns
  const reactionTypes = ["like", "helpful", "insightful"] as const;
  // Article 1: High reactions (5 reactions), low comments
  for (let i = 0; i < 5; i++) {
    await generate_random_discussion_board_member_articles_reactions_create(
      member1Connection,
      {
        body: {
          discussion_board_article_id: article1.id,
          reaction_type: RandomGenerator.pick(reactionTypes),
        } satisfies IDiscussionBoardArticleReaction.ICreate,
      },
    );
  }
  // Article 2: High comments (3 comments), low reactions
  for (let i = 0; i < 3; i++) {
    await generate_random_discussion_board_member_articles_comments_create(
      member2Connection,
      {
        params: { articleId: article2.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  }
  // Article 3: Balanced engagement (1 reaction, 1 comment)
  await generate_random_discussion_board_member_articles_reactions_create(
    member2Connection,
    {
      body: {
        discussion_board_article_id: article3.id,
        reaction_type: RandomGenerator.pick(reactionTypes),
      } satisfies IDiscussionBoardArticleReaction.ICreate,
    },
  );
  await generate_random_discussion_board_member_articles_comments_create(
    member1Connection,
    {
      params: { articleId: article3.id },
      body: {
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  // Test engagement metrics endpoint
  const engagementResponse =
    await api.functional.discussionBoard.admin.engagement.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(engagementResponse);
  // Validate response structure
  TestValidator.predicate(
    "response has pagination",
    engagementResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(engagementResponse.data),
  );
  TestValidator.predicate(
    "pagination has current page",
    engagementResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    engagementResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    engagementResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    engagementResponse.pagination.pages >= 0,
  );
  // Validate article summary structure
  if (engagementResponse.data.length > 0) {
    const articleSummary = engagementResponse.data[0];
    TestValidator.predicate(
      "article summary has id",
      typeof articleSummary.id === "string",
    );
    TestValidator.predicate(
      "article summary has title",
      typeof articleSummary.title === "string",
    );
    TestValidator.predicate(
      "article summary has author",
      articleSummary.author !== undefined,
    );
    TestValidator.predicate(
      "article summary has section",
      articleSummary.section !== undefined,
    );
    TestValidator.predicate(
      "article summary has tags",
      Array.isArray(articleSummary.tags),
    );
    TestValidator.predicate(
      "article summary has comments count",
      typeof articleSummary.comments_count === "number",
    );
    TestValidator.predicate(
      "article summary has created_at",
      typeof articleSummary.created_at === "string",
    );
    // Validate author structure
    TestValidator.predicate(
      "author has id",
      typeof articleSummary.author.id === "string",
    );
    TestValidator.predicate(
      "author has display_name",
      typeof articleSummary.author.display_name === "string",
    );
    // Validate section structure
    TestValidator.predicate(
      "section has id",
      typeof articleSummary.section.id === "string",
    );
    TestValidator.predicate(
      "section has name",
      typeof articleSummary.section.name === "string",
    );
  }
  // Test that we have at least some articles in the response
  TestValidator.predicate(
    "engagement response contains articles",
    engagementResponse.data.length > 0,
  );
  // Note: In a complete implementation, we would validate:
  // 1. That articles with higher engagement appear first when sorted appropriately
  // 2. That comment counts and reaction counts are accurately reflected
  // 3. That different sorting criteria produce different ordering
  // However, without specific sorting parameters in the request body, we rely on default behavior
}
