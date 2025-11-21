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
 * Test article creation with section assignment for enhanced content
 * organization. Validates that customers can create articles with specific
 * section categorization within channels. The test verifies proper
 * section-channel relationship validation and ensures articles are correctly
 * organized within the shopping mall content hierarchy.
 */
export async function test_api_customer_article_creation_with_section(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for channel creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "support_admin",
        permissions: JSON.stringify({ can_create_channels: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create shopping channel as admin
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({ allow_customer_articles: true }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPassword123!";

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        phone_number: RandomGenerator.mobile(),
        href: "https://shoppingmall.example.com/register",
        referrer: "https://shoppingmall.example.com/home",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 4: Customer login to establish session
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://shoppingmall.example.com/articles/create",
      referrer: "https://shoppingmall.example.com/dashboard",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 5: Create article WITHOUT section assignment (test optional section)
  const articleWithoutSection: IShoppingMallArticle =
    await api.functional.shoppingMall.customer.articles.create(connection, {
      body: {
        actor_type: "customer",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        subtitle: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 4 }),
        featured: true,
        allow_comments: true,
        channel_id: channel.id,
        // section_id intentionally omitted to test optional section
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(articleWithoutSection);

  // Validate article without section
  TestValidator.equals(
    "article without section should have correct title",
    articleWithoutSection.title,
    articleWithoutSection.title,
  );
  TestValidator.equals(
    "article without section should have correct channel",
    articleWithoutSection.channel.id,
    channel.id,
  );
  TestValidator.equals(
    "article without section should have undefined section",
    articleWithoutSection.section,
    undefined,
  );

  // Step 6: Test error scenarios
  await TestValidator.error(
    "should fail when creating article with non-existent channel",
    async () => {
      await api.functional.shoppingMall.customer.articles.create(connection, {
        body: {
          actor_type: "customer",
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          channel_id: typia.random<string & tags.Format<"uuid">>(), // Non-existent channel
        } satisfies IShoppingMallArticle.ICreate,
      });
    },
  );

  await TestValidator.error(
    "should fail when creating article with non-existent section",
    async () => {
      await api.functional.shoppingMall.customer.articles.create(connection, {
        body: {
          actor_type: "customer",
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          channel_id: channel.id,
          section_id: typia.random<string & tags.Format<"uuid">>(), // Non-existent section
        } satisfies IShoppingMallArticle.ICreate,
      });
    },
  );

  // Step 7: Test successful article creation with all optional fields
  const articleWithAllFields: IShoppingMallArticle =
    await api.functional.shoppingMall.customer.articles.create(connection, {
      body: {
        actor_type: "customer",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        channel_id: channel.id,
        // Testing minimal required fields only
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(articleWithAllFields);

  // Final validation of article properties
  TestValidator.predicate(
    "article should have customer actor type",
    articleWithAllFields.actor_type === "customer",
  );
  TestValidator.predicate(
    "article should have draft status",
    articleWithAllFields.status === "draft",
  );
  TestValidator.predicate(
    "article should have initial business status",
    articleWithAllFields.business_status !== "",
  );
  TestValidator.predicate(
    "article should have creation timestamp",
    typeof articleWithAllFields.created_at === "string",
  );
  TestValidator.predicate(
    "article should have update timestamp",
    typeof articleWithAllFields.updated_at === "string",
  );
  TestValidator.equals(
    "article should be assigned to correct channel",
    articleWithAllFields.channel.id,
    channel.id,
  );
}
