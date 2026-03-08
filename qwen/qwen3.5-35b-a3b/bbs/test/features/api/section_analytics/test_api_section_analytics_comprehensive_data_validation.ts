import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleAttachment";
import type { IEconomicPoliticalBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleTag";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardSectionAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSectionAnalytic";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_economic_political_board_admin_sections_create } from "../../../generate/generate_random_economic_political_board_admin_sections_create";
import { generate_random_economic_political_board_member_articles_comments_create } from "../../../generate/generate_random_economic_political_board_member_articles_comments_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_article_attachment } from "../../../prepare/prepare_random_economic_political_board_article_attachment";
import { prepare_random_economic_political_board_comment } from "../../../prepare/prepare_random_economic_political_board_comment";
import { prepare_random_economic_political_board_section } from "../../../prepare/prepare_random_economic_political_board_section";

export async function test_api_section_analytics_comprehensive_data_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for section management
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<
    string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
  >();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // Admin login for section operations
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection2, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  // 2. Create 3 member accounts (authors)
  const member1Email = typia.random<
    string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
  >();
  const member1Password = RandomGenerator.alphaNumeric(16);
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: member1Email,
      password: member1Password,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1Auth);
  const member2Email = typia.random<
    string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
  >();
  const member2Password = RandomGenerator.alphaNumeric(16);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: member2Email,
      password: member2Password,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2Auth);
  const member3Email = typia.random<
    string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
  >();
  const member3Password = RandomGenerator.alphaNumeric(16);
  const member3Connection: api.IConnection = { host: connection.host };
  const member3Auth = await authorize_member_join(member3Connection, {
    body: {
      email: member3Email,
      password: member3Password,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member3Auth);
  // 3. Admin creates a section
  const section =
    await api.functional.economicPoliticalBoard.admin.sections.create(
      adminConnection2,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEconomicPoliticalBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 4. Create 5 articles with 3 different authors and various tags
  const article1 =
    await api.functional.economicPoliticalBoard.member.articles.create(
      member1Connection,
      {
        body: {
          title: "Economic Analysis Article",
          content: RandomGenerator.content({ paragraphs: 2 }),
          section_id: section.id,
          tagIds: [typia.random<string & tags.Format<"uuid">>()] as (string &
            tags.Format<"uuid">)[],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  const article2 =
    await api.functional.economicPoliticalBoard.member.articles.create(
      member2Connection,
      {
        body: {
          title: "Political Discussion Article",
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: section.id,
          tagIds: [typia.random<string & tags.Format<"uuid">>()] as (string &
            tags.Format<"uuid">)[],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  const article3 =
    await api.functional.economicPoliticalBoard.member.articles.create(
      member1Connection,
      {
        body: {
          title: "Policy Review Article",
          content: RandomGenerator.content({ paragraphs: 2 }),
          section_id: section.id,
          tagIds: [typia.random<string & tags.Format<"uuid">>()] as (string &
            tags.Format<"uuid">)[],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article3);
  const article4 =
    await api.functional.economicPoliticalBoard.member.articles.create(
      member3Connection,
      {
        body: {
          title: "Society Analysis Article",
          content: RandomGenerator.content({ paragraphs: 4 }),
          section_id: section.id,
          tagIds: [typia.random<string & tags.Format<"uuid">>()] as (string &
            tags.Format<"uuid">)[],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article4);
  const article5 =
    await api.functional.economicPoliticalBoard.member.articles.create(
      member2Connection,
      {
        body: {
          title: "Government Review Article",
          content: RandomGenerator.content({ paragraphs: 2 }),
          section_id: section.id,
          tagIds: [typia.random<string & tags.Format<"uuid">>()] as (string &
            tags.Format<"uuid">)[],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article5);
  // 5. Create comments on articles (total 11 comments)
  // Article 1: 2 comments
  await api.functional.economicPoliticalBoard.member.articles.comments.create(
    member1Connection,
    {
      articleId: article1.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEconomicPoliticalBoardComment.ICreate,
    },
  );
  await api.functional.economicPoliticalBoard.member.articles.comments.create(
    member2Connection,
    {
      articleId: article1.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEconomicPoliticalBoardComment.ICreate,
    },
  );
  // Article 2: 5 comments
  await api.functional.economicPoliticalBoard.member.articles.comments.create(
    member1Connection,
    {
      articleId: article2.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEconomicPoliticalBoardComment.ICreate,
    },
  );
  await api.functional.economicPoliticalBoard.member.articles.comments.create(
    member2Connection,
    {
      articleId: article2.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IEconomicPoliticalBoardComment.ICreate,
    },
  );
  await api.functional.economicPoliticalBoard.member.articles.comments.create(
    member3Connection,
    {
      articleId: article2.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEconomicPoliticalBoardComment.ICreate,
    },
  );
  await api.functional.economicPoliticalBoard.member.articles.comments.create(
    member1Connection,
    {
      articleId: article2.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEconomicPoliticalBoardComment.ICreate,
    },
  );
  await api.functional.economicPoliticalBoard.member.articles.comments.create(
    member2Connection,
    {
      articleId: article2.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEconomicPoliticalBoardComment.ICreate,
    },
  );
  // Article 3: 1 comment
  await api.functional.economicPoliticalBoard.member.articles.comments.create(
    member3Connection,
    {
      articleId: article3.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEconomicPoliticalBoardComment.ICreate,
    },
  );
  // Article 4: 3 comments
  await api.functional.economicPoliticalBoard.member.articles.comments.create(
    member1Connection,
    {
      articleId: article4.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEconomicPoliticalBoardComment.ICreate,
    },
  );
  await api.functional.economicPoliticalBoard.member.articles.comments.create(
    member2Connection,
    {
      articleId: article4.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEconomicPoliticalBoardComment.ICreate,
    },
  );
  await api.functional.economicPoliticalBoard.member.articles.comments.create(
    member3Connection,
    {
      articleId: article4.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IEconomicPoliticalBoardComment.ICreate,
    },
  );
  // Article 5: 0 comments (deliberately omitted)
  // 6. Request analytics and validate
  const analytics =
    await api.functional.economicPoliticalBoard.admin.sections.analytics(
      connection,
      {
        sectionId: section.id,
        body: {},
      },
    );
  typia.assert(analytics);
  // Validate article count
  TestValidator.equals("article count", analytics.articleCount, 5);
  // Validate comment count (2 + 5 + 1 + 3 + 0 = 11)
  TestValidator.equals("comment count", analytics.commentCount, 11);
  // Validate active author count (3 unique authors)
  TestValidator.equals("active author count", analytics.activeAuthorCount, 3);
  // Validate recent article count (all 5 should be within 90 days default)
  TestValidator.equals(
    "recent article count (90 days)",
    analytics.recentArticleCount,
    5,
  );
  // Validate tag distribution format
  TestValidator.equals(
    "tag distribution is array",
    Array.isArray(analytics.tagDistribution),
    true,
  );
  // Validate each tag in distribution has correct structure
  for (const tag of analytics.tagDistribution) {
    typia.assert(tag);
    // Verify tag structure
    TestValidator.predicate(
      "tag has id",
      tag.id !== undefined && tag.id !== null,
    );
    TestValidator.predicate(
      "tag has section",
      tag.section !== undefined && tag.section !== null,
    );
    TestValidator.predicate(
      "tag has tag",
      tag.tag !== undefined && tag.tag !== null,
    );
    TestValidator.predicate(
      "tag has articleCount",
      tag.articleCount !== undefined,
    );
    TestValidator.predicate(
      "tag has createdAt",
      tag.createdAt !== undefined && tag.createdAt !== null,
    );
    TestValidator.predicate(
      "tag has lastUsedAt",
      tag.lastUsedAt !== undefined && tag.lastUsedAt !== null,
    );
  }
  // Validate section structure in response
  typia.assert(analytics.section);
  TestValidator.predicate("section has id", analytics.section.id !== undefined);
  TestValidator.predicate(
    "section has name",
    analytics.section.name !== undefined,
  );
  TestValidator.predicate(
    "section has description",
    analytics.section.description !== undefined,
  );
  TestValidator.predicate(
    "section has created_at",
    analytics.section.created_at !== undefined,
  );
  TestValidator.predicate(
    "section has articleCount",
    analytics.section.articleCount !== undefined,
  );
}
