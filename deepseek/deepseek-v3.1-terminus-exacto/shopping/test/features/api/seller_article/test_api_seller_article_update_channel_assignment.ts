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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller updating article content and metadata while maintaining channel
 * assignments. Validates that sellers can modify article properties like title,
 * content, and publication settings while the channel organization remains
 * intact.
 */
export async function test_api_seller_article_update_channel_assignment(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for channel setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ admin: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create initial channel for article creation
  const initialChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: "initial-channel",
        name: "Initial Shopping Channel",
        description: "Primary channel for seller articles",
        status: "active",
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(initialChannel);

  // Step 3: Switch to seller authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPassword123!";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.name(2),
      contact_person: RandomGenerator.name(2),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com/",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Seller creates initial article in first channel
  const initialArticle =
    await api.functional.shoppingMall.seller.articles.create(connection, {
      body: {
        actor_type: "seller",
        title: RandomGenerator.paragraph({ sentences: 5 }),
        subtitle: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 4 }),
        featured: false,
        allow_comments: true,
        channel_id: initialChannel.id,
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(initialArticle);

  // Step 5: Switch back to admin to create additional channel
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://shoppingmall.example.com/admin/dashboard",
      referrer: "https://shoppingmall.example.com/",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  const additionalChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: "additional-channel",
        name: "Additional Shopping Channel",
        description: "Secondary channel for content organization",
        status: "active",
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(additionalChannel);

  // Step 6: Switch back to seller for article update
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com/",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 7: Seller updates article content and metadata (channel remains unchanged)
  const updatedArticle =
    await api.functional.shoppingMall.seller.articles.update(connection, {
      articleId: initialArticle.id,
      body: {
        title: "Updated: " + initialArticle.title,
        subtitle: "Enhanced content with new features",
        content: RandomGenerator.content({ paragraphs: 4 }),
        summary: "Article content has been significantly improved",
        featured: true,
        allow_comments: false,
      } satisfies IShoppingMallArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 8: Validate article update results
  TestValidator.equals(
    "article ID remains unchanged",
    updatedArticle.id,
    initialArticle.id,
  );
  TestValidator.notEquals(
    "title should be updated",
    updatedArticle.title,
    initialArticle.title,
  );
  TestValidator.notEquals(
    "content should be updated",
    updatedArticle.content,
    initialArticle.content,
  );
  TestValidator.notEquals(
    "subtitle should be updated",
    updatedArticle.subtitle,
    initialArticle.subtitle,
  );
  TestValidator.notEquals(
    "summary should be updated",
    updatedArticle.summary,
    initialArticle.summary,
  );
  TestValidator.predicate(
    "article should be featured after update",
    updatedArticle.featured === true,
  );
  TestValidator.predicate(
    "comments should be disabled after update",
    updatedArticle.allow_comments === false,
  );

  // Step 9: Validate channel assignment remains intact
  TestValidator.equals(
    "channel assignment remains unchanged",
    updatedArticle.channel.id,
    initialArticle.channel.id,
  );
  TestValidator.equals(
    "channel name remains consistent",
    updatedArticle.channel.name,
    initialArticle.channel.name,
  );
  TestValidator.equals(
    "section remains undefined",
    updatedArticle.section,
    initialArticle.section,
  );

  // Step 10: Validate business logic and system properties
  TestValidator.predicate(
    "article should have seller actor type",
    updatedArticle.actor_type === "seller",
  );
  TestValidator.predicate(
    "article should have valid creation timestamp",
    updatedArticle.created_at !== null,
  );
  TestValidator.predicate(
    "article should have valid update timestamp",
    updatedArticle.updated_at !== null,
  );
  TestValidator.predicate(
    "update timestamp should be after creation",
    new Date(updatedArticle.updated_at) > new Date(updatedArticle.created_at),
  );

  // Step 11: Validate article remains in draft status (default)
  TestValidator.equals(
    "article status remains draft",
    updatedArticle.status,
    "draft",
  );
  TestValidator.equals(
    "business status remains consistent",
    updatedArticle.business_status,
    initialArticle.business_status,
  );
}
