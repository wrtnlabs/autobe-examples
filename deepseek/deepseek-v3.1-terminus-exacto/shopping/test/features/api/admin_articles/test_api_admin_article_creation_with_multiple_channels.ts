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
 * Test administrator ability to create articles across multiple shopping
 * channels.
 *
 * This test validates that administrators can create articles in different
 * shopping channels and that the platform properly handles cross-channel
 * content management. The workflow includes admin authentication, channel
 * creation, and article creation in multiple channels to ensure comprehensive
 * platform functionality.
 */
export async function test_api_admin_article_creation_with_multiple_channels(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
      permissions: JSON.stringify({
        article_management: true,
        channel_management: true,
        content_publishing: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create first shopping channel
  const channel1 = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: `channel_${RandomGenerator.alphaNumeric(8)}`,
        name: "Premium Retail Channel",
        description: "High-end retail products and luxury shopping experience",
        status: "active",
        configuration: JSON.stringify({
          allow_article_posting: true,
          moderation_required: false,
          max_article_length: 5000,
        }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel1);

  // Step 3: Create second shopping channel
  const channel2 = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: `channel_${RandomGenerator.alphaNumeric(8)}`,
        name: "Outlet Store Channel",
        description: "Discounted products and clearance sales",
        status: "active",
        configuration: JSON.stringify({
          allow_article_posting: true,
          moderation_required: true,
          max_article_length: 3000,
        }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel2);

  // Step 4: Create article in first channel
  const article1 = await api.functional.shoppingMall.admin.articles.create(
    connection,
    {
      body: {
        actor_type: "administrator",
        title: RandomGenerator.paragraph({ sentences: 5 }),
        subtitle: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 3 }),
        featured: true,
        allow_comments: true,
        channel_id: channel1.id,
      } satisfies IShoppingMallArticle.ICreate,
    },
  );
  typia.assert(article1);

  // Validate article assignment to first channel
  TestValidator.equals(
    "article1 should be assigned to channel1",
    article1.channel.id,
    channel1.id,
  );

  // Step 5: Create article in second channel
  const article2 = await api.functional.shoppingMall.admin.articles.create(
    connection,
    {
      body: {
        actor_type: "administrator",
        title: RandomGenerator.paragraph({ sentences: 4 }),
        subtitle: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        featured: false,
        allow_comments: false,
        channel_id: channel2.id,
      } satisfies IShoppingMallArticle.ICreate,
    },
  );
  typia.assert(article2);

  // Validate article assignment to second channel
  TestValidator.equals(
    "article2 should be assigned to channel2",
    article2.channel.id,
    channel2.id,
  );

  // Step 6: Validate cross-channel differentiation
  TestValidator.notEquals(
    "articles should have different IDs",
    article1.id,
    article2.id,
  );
  TestValidator.notEquals(
    "articles should be assigned to different channels",
    article1.channel.id,
    article2.channel.id,
  );
  TestValidator.predicate(
    "article1 should have featured status",
    article1.featured === true,
  );
  TestValidator.predicate(
    "article2 should have non-featured status",
    article2.featured === false,
  );

  // Step 7: Validate article properties
  TestValidator.predicate(
    "article1 should have valid title",
    article1.title.length > 0,
  );
  TestValidator.predicate(
    "article1 should have valid content",
    article1.content.length > 0,
  );
  TestValidator.predicate(
    "article2 should have valid title",
    article2.title.length > 0,
  );
  TestValidator.predicate(
    "article2 should have valid content",
    article2.content.length > 0,
  );
  TestValidator.predicate(
    "article1 should allow comments",
    article1.allow_comments === true,
  );
  TestValidator.predicate(
    "article2 should disallow comments",
    article2.allow_comments === false,
  );

  // Step 8: Validate channel information in articles
  TestValidator.equals(
    "article1 channel name should match channel1",
    article1.channel.name,
    channel1.name,
  );
  TestValidator.equals(
    "article2 channel name should match channel2",
    article2.channel.name,
    channel2.name,
  );
  TestValidator.predicate(
    "article1 channel code should be valid",
    article1.channel.code.length > 0,
  );
  TestValidator.predicate(
    "article2 channel code should be valid",
    article2.channel.code.length > 0,
  );
}
