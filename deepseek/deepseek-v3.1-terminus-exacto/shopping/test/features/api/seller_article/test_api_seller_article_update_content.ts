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
 * Test seller updating article content with business-specific information.
 * Validates that authenticated sellers can modify their articles while
 * maintaining proper content validation and business workflow status
 * transitions.
 */
export async function test_api_seller_article_update_content(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for channel creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({ can_create_channels: true }),
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create shopping mall channel
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "seller123",
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_person: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_address: RandomGenerator.content({ paragraphs: 1 }),
        href: "https://shoppingmall.example.com/seller/join",
        referrer: "https://shoppingmall.example.com",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Login as seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      href: "https://shoppingmall.example.com/seller/dashboard",
      referrer: "https://shoppingmall.example.com/seller/join",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Create initial article
  const initialArticle: IShoppingMallArticle =
    await api.functional.shoppingMall.seller.articles.create(connection, {
      body: {
        actor_type: "seller",
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

  // Step 6: Update article content
  const updatedArticle: IShoppingMallArticle =
    await api.functional.shoppingMall.seller.articles.update(connection, {
      articleId: initialArticle.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        subtitle: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 4 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        featured: true,
        allow_comments: false,
      } satisfies IShoppingMallArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 7: Validate update results
  TestValidator.equals(
    "article ID remains unchanged",
    updatedArticle.id,
    initialArticle.id,
  );
  TestValidator.notEquals(
    "article title should be updated",
    updatedArticle.title,
    initialArticle.title,
  );
  TestValidator.notEquals(
    "article content should be updated",
    updatedArticle.content,
    initialArticle.content,
  );
  TestValidator.equals(
    "article actor type remains seller",
    updatedArticle.actor_type,
    "seller",
  );
  TestValidator.predicate(
    "article should be featured after update",
    updatedArticle.featured === true,
  );
  TestValidator.predicate(
    "comments should be disabled after update",
    updatedArticle.allow_comments === false,
  );
  TestValidator.equals(
    "channel reference remains consistent",
    updatedArticle.channel.id,
    channel.id,
  );
}
