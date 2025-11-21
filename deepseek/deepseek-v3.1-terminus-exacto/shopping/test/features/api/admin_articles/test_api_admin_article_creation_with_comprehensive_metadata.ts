import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test administrator article creation with full metadata configuration
 * including subtitles, summaries, and advanced publication settings. Validates
 * comprehensive content management capabilities for shopping mall platform
 * administrators.
 */
export async function test_api_admin_article_creation_with_comprehensive_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({
        content_management: true,
        channel_management: true,
        user_management: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create a channel for article organization
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: `channel_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
        configuration: JSON.stringify({
          allow_comments: true,
          max_article_length: 50000,
          require_moderation: false,
        }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Create article with comprehensive metadata
  const article = await api.functional.shoppingMall.admin.articles.create(
    connection,
    {
      body: {
        actor_type: "administrator",
        title: RandomGenerator.paragraph({ sentences: 5 }),
        subtitle: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({
          paragraphs: 4,
          sentenceMin: 8,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
        summary: RandomGenerator.paragraph({ sentences: 3 }),
        featured: true,
        allow_comments: true,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: Validate article metadata and relationships
  TestValidator.equals(
    "article has correct actor type",
    article.actor_type,
    "administrator",
  );
  TestValidator.equals(
    "article title is non-empty",
    article.title.length > 0,
    true,
  );
  TestValidator.predicate(
    "article subtitle is defined",
    article.subtitle !== undefined,
  );
  TestValidator.predicate(
    "article summary is defined",
    article.summary !== undefined,
  );
  TestValidator.equals(
    "article content is populated",
    article.content.length > 0,
    true,
  );
  TestValidator.equals("article is featured", article.featured, true);
  TestValidator.equals("article allows comments", article.allow_comments, true);
  TestValidator.equals(
    "article has correct channel",
    article.channel.id,
    channel.id,
  );
  TestValidator.equals("article has default view count", article.view_count, 0);
  TestValidator.equals("article has default like count", article.like_count, 0);
  TestValidator.equals(
    "article has default share count",
    article.share_count,
    0,
  );
  TestValidator.equals(
    "article has publication status",
    article.status,
    "draft",
  );
  TestValidator.equals(
    "article has business status",
    article.business_status,
    "pending_review",
  );
  TestValidator.predicate(
    "article has creation timestamp",
    typeof article.created_at === "string",
  );
  TestValidator.predicate(
    "article has update timestamp",
    typeof article.updated_at === "string",
  );
  TestValidator.equals(
    "article published_at is initially null",
    article.published_at,
    null,
  );
  TestValidator.equals(
    "article deleted_at is initially null",
    article.deleted_at,
    undefined,
  );
}
