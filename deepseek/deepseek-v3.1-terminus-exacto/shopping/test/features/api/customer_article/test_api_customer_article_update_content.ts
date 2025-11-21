import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test customer updating article content including title, subtitle, and body
 * text. Validates that authenticated customers can modify their own articles
 * while maintaining proper content validation and status transitions. The
 * scenario ensures that only the article owner can update the content and that
 * system-generated fields like view counts and timestamps are properly
 * managed.
 */
export async function test_api_customer_article_update_content(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for channel creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123456";

  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({ access_level: "full" }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create channel as admin
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({ allow_customer_content: true }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer123";

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        phone_number: RandomGenerator.mobile(),
        ip: "192.168.1.1",
        href: "https://shoppingmall.com/register",
        referrer: "https://shoppingmall.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 4: Customer creates initial article
  const initialArticle: IShoppingMallArticle =
    await api.functional.shoppingMall.customer.articles.create(connection, {
      body: {
        actor_type: "customer",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        subtitle: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 4 }),
        featured: false,
        allow_comments: true,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(initialArticle);

  // Step 5: Customer updates article content
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const updatedSubtitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedContent = RandomGenerator.content({ paragraphs: 4 });

  const updatedArticle: IShoppingMallArticle =
    await api.functional.shoppingMall.customer.articles.update(connection, {
      articleId: initialArticle.id,
      body: {
        title: updatedTitle,
        subtitle: updatedSubtitle,
        content: updatedContent,
      } satisfies IShoppingMallArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 6: Validate that updates were applied correctly
  TestValidator.equals(
    "title should be updated",
    updatedArticle.title,
    updatedTitle,
  );
  TestValidator.equals(
    "subtitle should be updated",
    updatedArticle.subtitle,
    updatedSubtitle,
  );
  TestValidator.equals(
    "content should be updated",
    updatedArticle.content,
    updatedContent,
  );

  // Step 7: Validate that system-generated fields are preserved
  TestValidator.equals(
    "article ID should remain the same",
    updatedArticle.id,
    initialArticle.id,
  );
  TestValidator.equals(
    "channel should remain the same",
    updatedArticle.channel.id,
    initialArticle.channel.id,
  );
  TestValidator.equals(
    "actor type should remain the same",
    updatedArticle.actor_type,
    initialArticle.actor_type,
  );
  TestValidator.equals(
    "created at timestamp should remain the same",
    updatedArticle.created_at,
    initialArticle.created_at,
  );

  // Step 8: Validate that view count and other metrics are properly managed
  TestValidator.predicate(
    "view count should be a non-negative integer",
    updatedArticle.view_count >= 0,
  );
  TestValidator.predicate(
    "like count should be a non-negative integer",
    updatedArticle.like_count >= 0,
  );
  TestValidator.predicate(
    "share count should be a non-negative integer",
    updatedArticle.share_count >= 0,
  );

  // Step 9: Validate that updated timestamp reflects the change
  TestValidator.notEquals(
    "updated at timestamp should change after update",
    updatedArticle.updated_at,
    initialArticle.updated_at,
  );

  // Step 10: Test partial update (only title)
  const titleOnlyUpdate = RandomGenerator.paragraph({ sentences: 5 });

  const titleUpdatedArticle: IShoppingMallArticle =
    await api.functional.shoppingMall.customer.articles.update(connection, {
      articleId: initialArticle.id,
      body: {
        title: titleOnlyUpdate,
      } satisfies IShoppingMallArticle.IUpdate,
    });
  typia.assert(titleUpdatedArticle);

  // Validate partial update
  TestValidator.equals(
    "title should be updated in partial update",
    titleUpdatedArticle.title,
    titleOnlyUpdate,
  );
  TestValidator.equals(
    "subtitle should remain unchanged in partial update",
    titleUpdatedArticle.subtitle,
    updatedSubtitle,
  );
  TestValidator.equals(
    "content should remain unchanged in partial update",
    titleUpdatedArticle.content,
    updatedContent,
  );
}
