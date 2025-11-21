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
 * Comprehensive article content update workflow validation for shopping mall
 * administrators.
 *
 * This E2E test validates the complete article update lifecycle including
 * administrator authentication, channel setup, article creation, and various
 * update scenarios. The test ensures that administrators can modify article
 * properties while maintaining proper workflow transitions, content integrity,
 * and system-managed field preservation.
 *
 * Test scenarios include:
 *
 * 1. Administrator account creation and authentication
 * 2. Content channel establishment for article organization
 * 3. Initial article creation with comprehensive metadata
 * 4. Partial updates (title-only, content-only, metadata-only)
 * 5. Full article content overhaul
 * 6. Status transition validation (draft → published → archived)
 * 7. Business workflow status updates
 * 8. Featured status and comment permission modifications
 * 9. System-managed field preservation validation
 * 10. Error scenario testing for invalid operations
 */
export async function test_api_admin_article_content_update(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ article_management: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create content channel for article assignment
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: `channel_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({
          allow_comments: true,
          moderation_required: false,
        }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Create initial article for update testing
  const initialArticle =
    await api.functional.shoppingMall.admin.articles.create(connection, {
      body: {
        actor_type: "administrator",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        subtitle: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        featured: false,
        allow_comments: true,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(initialArticle);

  // Step 4: Test partial title update
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const titleOnlyUpdate =
    await api.functional.shoppingMall.admin.articles.update(connection, {
      articleId: initialArticle.id,
      body: {
        title: updatedTitle,
      } satisfies IShoppingMallArticle.IUpdate,
    });
  typia.assert(titleOnlyUpdate);
  TestValidator.equals(
    "title should be updated",
    titleOnlyUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "content should remain unchanged",
    titleOnlyUpdate.content,
    initialArticle.content,
  );
  TestValidator.equals(
    "subtitle should remain unchanged",
    titleOnlyUpdate.subtitle,
    initialArticle.subtitle,
  );

  // Step 5: Test partial content update
  const updatedContent = RandomGenerator.content({ paragraphs: 4 });
  const contentOnlyUpdate =
    await api.functional.shoppingMall.admin.articles.update(connection, {
      articleId: initialArticle.id,
      body: {
        content: updatedContent,
      } satisfies IShoppingMallArticle.IUpdate,
    });
  typia.assert(contentOnlyUpdate);
  TestValidator.equals(
    "content should be updated",
    contentOnlyUpdate.content,
    updatedContent,
  );
  TestValidator.equals(
    "title should remain updated",
    contentOnlyUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "subtitle should remain unchanged",
    contentOnlyUpdate.subtitle,
    initialArticle.subtitle,
  );

  // Step 6: Test metadata update (subtitle and summary)
  const updatedSubtitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedSummary = RandomGenerator.paragraph({ sentences: 3 });
  const metadataUpdate =
    await api.functional.shoppingMall.admin.articles.update(connection, {
      articleId: initialArticle.id,
      body: {
        subtitle: updatedSubtitle,
        summary: updatedSummary,
      } satisfies IShoppingMallArticle.IUpdate,
    });
  typia.assert(metadataUpdate);
  TestValidator.equals(
    "subtitle should be updated",
    metadataUpdate.subtitle,
    updatedSubtitle,
  );
  TestValidator.equals(
    "summary should be updated",
    metadataUpdate.summary,
    updatedSummary,
  );
  TestValidator.equals(
    "title should remain updated",
    metadataUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "content should remain updated",
    metadataUpdate.content,
    updatedContent,
  );

  // Step 7: Test status transition from draft to published
  const statusUpdate = await api.functional.shoppingMall.admin.articles.update(
    connection,
    {
      articleId: initialArticle.id,
      body: {
        status: "published",
        business_status: "approved",
      } satisfies IShoppingMallArticle.IUpdate,
    },
  );
  typia.assert(statusUpdate);
  TestValidator.equals(
    "status should be published",
    statusUpdate.status,
    "published",
  );
  TestValidator.equals(
    "business_status should be approved",
    statusUpdate.business_status,
    "approved",
  );
  TestValidator.predicate(
    "published_at should be set when status changes to published",
    statusUpdate.published_at !== null &&
      statusUpdate.published_at !== undefined,
  );

  // Step 8: Test featured status and comment permissions
  const featureUpdate = await api.functional.shoppingMall.admin.articles.update(
    connection,
    {
      articleId: initialArticle.id,
      body: {
        featured: true,
        allow_comments: false,
      } satisfies IShoppingMallArticle.IUpdate,
    },
  );
  typia.assert(featureUpdate);
  TestValidator.equals(
    "article should be featured",
    featureUpdate.featured,
    true,
  );
  TestValidator.equals(
    "comments should be disabled",
    featureUpdate.allow_comments,
    false,
  );

  // Step 9: Test system-managed field preservation
  TestValidator.equals(
    "view count should be preserved",
    featureUpdate.view_count,
    initialArticle.view_count,
  );
  TestValidator.equals(
    "like count should be preserved",
    featureUpdate.like_count,
    initialArticle.like_count,
  );
  TestValidator.equals(
    "share count should be preserved",
    featureUpdate.share_count,
    initialArticle.share_count,
  );
  TestValidator.equals(
    "created_at should be preserved",
    featureUpdate.created_at,
    initialArticle.created_at,
  );
  TestValidator.notEquals(
    "updated_at should be newer",
    featureUpdate.updated_at,
    initialArticle.updated_at,
  );

  // Step 10: Test final comprehensive update to archived status
  const finalUpdate = await api.functional.shoppingMall.admin.articles.update(
    connection,
    {
      articleId: initialArticle.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        content: RandomGenerator.content({ paragraphs: 5 }),
        status: "archived",
        business_status: "completed",
        featured: false,
        allow_comments: true,
      } satisfies IShoppingMallArticle.IUpdate,
    },
  );
  typia.assert(finalUpdate);
  TestValidator.equals(
    "final status should be archived",
    finalUpdate.status,
    "archived",
  );
  TestValidator.equals(
    "final business_status should be completed",
    finalUpdate.business_status,
    "completed",
  );
  TestValidator.equals(
    "final featured should be false",
    finalUpdate.featured,
    false,
  );
  TestValidator.equals(
    "final allow_comments should be true",
    finalUpdate.allow_comments,
    true,
  );

  // Step 11: Test error scenarios
  // Test invalid status transition (archived back to draft should fail)
  await TestValidator.error(
    "should reject invalid status transition from archived to draft",
    async () => {
      await api.functional.shoppingMall.admin.articles.update(connection, {
        articleId: initialArticle.id,
        body: {
          status: "draft",
        } satisfies IShoppingMallArticle.IUpdate,
      });
    },
  );

  // Test empty title validation
  await TestValidator.error("should reject empty title", async () => {
    await api.functional.shoppingMall.admin.articles.update(connection, {
      articleId: initialArticle.id,
      body: {
        title: "",
      } satisfies IShoppingMallArticle.IUpdate,
    });
  });

  // Test channel relationship preservation
  TestValidator.equals(
    "channel reference should be preserved throughout updates",
    finalUpdate.channel.id,
    channel.id,
  );
  TestValidator.equals(
    "channel name should be preserved",
    finalUpdate.channel.name,
    channel.name,
  );
  TestValidator.equals(
    "channel code should be preserved",
    finalUpdate.channel.code,
    channel.code,
  );

  // Step 12: Verify all updates maintained data integrity
  TestValidator.predicate(
    "article ID should remain constant throughout all updates",
    finalUpdate.id === initialArticle.id,
  );
  TestValidator.predicate(
    "actor_type should remain administrator",
    finalUpdate.actor_type === "administrator",
  );
  TestValidator.predicate(
    "channel assignment should remain consistent",
    finalUpdate.channel.id === initialArticle.channel.id,
  );
}
