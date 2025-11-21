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
 * Test article creation with optional section assignment for enhanced content
 * organization.
 *
 * This E2E test validates the complete workflow of seller article creation
 * within a shopping mall platform, including hierarchical content structuring
 * through channels and sections. The test follows a multi-actor authentication
 * pattern where administrators create the organizational structure and sellers
 * create content within that structure.
 */
export async function test_api_seller_article_creation_with_section_assignment(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({
          manage_channels: true,
          manage_sections: true,
        }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create shopping mall channel as administrator
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({ allow_articles: true }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create section within the channel
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelCode: channel.code,
        body: {
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: 1,
          status: "active",
          configuration: JSON.stringify({ featured: false }),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // Step 4: Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123";

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_person: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_address: RandomGenerator.content({ paragraphs: 1 }),
        tax_id: RandomGenerator.alphaNumeric(10),
        href: "https://shopping-mall.example.com/seller/dashboard",
        referrer: "https://shopping-mall.example.com/join",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 5: Authenticate as seller before creating article
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://shopping-mall.example.com/seller/dashboard",
      referrer: "https://shopping-mall.example.com/login",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 6: Seller creates article with section assignment
  const article: IShoppingMallArticle =
    await api.functional.shoppingMall.seller.articles.create(connection, {
      body: {
        actor_type: "seller",
        title: RandomGenerator.paragraph({ sentences: 4 }),
        subtitle: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 3 }),
        featured: false,
        allow_comments: true,
        channel_id: channel.id,
        section_id: section.id,
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(article);

  // Step 7: Validate article creation response
  TestValidator.equals(
    "article actor type should be seller",
    article.actor_type,
    "seller",
  );
  TestValidator.equals(
    "article channel ID should match created channel",
    article.channel.id,
    channel.id,
  );
  TestValidator.equals(
    "article section ID should match created section",
    article.section?.id,
    section.id,
  );
  TestValidator.predicate(
    "article should have valid status",
    article.status === "draft" || article.status === "published",
  );
  TestValidator.predicate(
    "article should have valid business status",
    typeof article.business_status === "string",
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

  // Step 8: Validate organizational hierarchy
  TestValidator.equals(
    "article channel name should match",
    article.channel.name,
    channel.name,
  );
  TestValidator.equals(
    "article channel code should match",
    article.channel.code,
    channel.code,
  );
  TestValidator.equals(
    "article section name should match",
    article.section?.name,
    section.name,
  );
  TestValidator.equals(
    "article section display order should match",
    article.section?.display_order,
    section.display_order,
  );

  // Step 9: Validate content integrity
  TestValidator.predicate(
    "article title should not be empty",
    article.title.length > 0,
  );
  TestValidator.predicate(
    "article content should not be empty",
    article.content.length > 0,
  );
  TestValidator.predicate(
    "article should have creation timestamp",
    typeof article.created_at === "string",
  );
  TestValidator.predicate(
    "article should have update timestamp",
    typeof article.updated_at === "string",
  );

  // Step 10: Validate hierarchical content organization
  TestValidator.predicate(
    "article should be properly categorized within channel",
    article.channel.id === channel.id && article.section?.id === section.id,
  );
  TestValidator.predicate(
    "article organizational structure should be complete",
    article.channel !== undefined && article.section !== undefined,
  );
}
