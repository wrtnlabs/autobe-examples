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
 * Validates administrator article creation with comprehensive moderation
 * workflow. Tests the complete flow from admin registration to article creation
 * with proper moderation controls and status transitions.
 */
export async function test_api_admin_article_creation_with_moderation_workflow(
  connection: api.IConnection,
) {
  // Step 1: Administrator registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminAuth: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "support_admin",
        permissions: JSON.stringify({
          "article.create": true,
          "article.publish": true,
          "channel.manage": true,
        }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(adminAuth);

  // Step 2: Create a channel for article placement
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8).toLowerCase(),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({
          "article.moderation": true,
          "auto.publish": false,
          "allow.comments": true,
        }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create article with administrative controls
  const articleContent: string = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const article: IShoppingMallArticle =
    await api.functional.shoppingMall.admin.articles.create(connection, {
      body: {
        actor_type: "administrator",
        title: RandomGenerator.paragraph({ sentences: 5 }),
        subtitle: RandomGenerator.paragraph({ sentences: 3 }),
        content: articleContent,
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        featured: true,
        allow_comments: true,
        channel_id: channel.id,
        section_id: undefined,
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(article);

  // Step 4: Validate article properties and moderation workflow
  TestValidator.equals(
    "article actor type should be administrator",
    article.actor_type,
    "administrator",
  );
  TestValidator.equals(
    "article title should be non-empty",
    article.title.length > 0,
    true,
  );
  TestValidator.equals(
    "article content should match input",
    article.content,
    articleContent,
  );
  TestValidator.equals(
    "article channel ID should match created channel",
    article.channel.id,
    channel.id,
  );
  TestValidator.predicate(
    "article should be featured",
    article.featured === true,
  );
  TestValidator.predicate(
    "article should allow comments",
    article.allow_comments === true,
  );
  TestValidator.equals(
    "article view count should be initialized to 0",
    article.view_count,
    0,
  );
  TestValidator.equals(
    "article like count should be initialized to 0",
    article.like_count,
    0,
  );
  TestValidator.equals(
    "article share count should be initialized to 0",
    article.share_count,
    0,
  );

  // Validate moderation workflow status
  TestValidator.predicate(
    "article status should be appropriate for moderation workflow",
    article.status === "draft" ||
      article.status === "pending_review" ||
      article.status === "published",
  );
  TestValidator.predicate(
    "article business status should be set",
    typeof article.business_status === "string" &&
      article.business_status.length > 0,
  );

  // Validate timestamps
  TestValidator.predicate(
    "article should have creation timestamp",
    typeof article.created_at === "string" && article.created_at.length > 0,
  );
  TestValidator.predicate(
    "article should have update timestamp",
    typeof article.updated_at === "string" && article.updated_at.length > 0,
  );

  // Validate channel relationship
  TestValidator.equals(
    "channel name should match",
    article.channel.name,
    channel.name,
  );
  TestValidator.equals(
    "channel code should match",
    article.channel.code,
    channel.code,
  );
}
