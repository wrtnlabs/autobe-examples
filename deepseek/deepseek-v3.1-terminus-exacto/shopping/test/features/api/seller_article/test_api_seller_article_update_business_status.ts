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
 * Test seller updating article business status for moderation workflows.
 *
 * Validates that sellers can transition articles through business approval
 * processes while ensuring proper workflow validation and status tracking for
 * seller content management.
 */
export async function test_api_seller_article_update_business_status(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 3 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 5 }),
      tax_id: RandomGenerator.alphaNumeric(10),
      href: "https://example.com/seller/register",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ access: "full" }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Switch to admin context and create channel
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin/dashboard",
      referrer: "https://example.com/admin/login",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 4: Switch back to seller context
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller/dashboard",
      referrer: "https://example.com/seller/login",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Create initial seller article with pending business status
  const initialArticle =
    await api.functional.shoppingMall.seller.articles.create(connection, {
      body: {
        actor_type: "seller",
        title: RandomGenerator.paragraph({ sentences: 5 }),
        subtitle: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 5 }),
        summary: RandomGenerator.paragraph({ sentences: 8 }),
        featured: false,
        allow_comments: true,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(initialArticle);

  // Step 6: Update article business status
  const updatedArticle =
    await api.functional.shoppingMall.seller.articles.update(connection, {
      articleId: initialArticle.id,
      body: {
        business_status: "approved",
        status: "published",
      } satisfies IShoppingMallArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 7: Validate the business status update
  TestValidator.equals(
    "business status should be updated to approved",
    updatedArticle.business_status,
    "approved",
  );
  TestValidator.equals(
    "publication status should be updated to published",
    updatedArticle.status,
    "published",
  );
  TestValidator.equals(
    "article ID should remain the same",
    updatedArticle.id,
    initialArticle.id,
  );
  TestValidator.equals(
    "article title should remain unchanged",
    updatedArticle.title,
    initialArticle.title,
  );
  TestValidator.equals(
    "article content should remain unchanged",
    updatedArticle.content,
    initialArticle.content,
  );

  // Step 8: Test additional business status transitions
  const furtherUpdatedArticle =
    await api.functional.shoppingMall.seller.articles.update(connection, {
      articleId: updatedArticle.id,
      body: {
        business_status: "under_review",
        status: "pending_review",
      } satisfies IShoppingMallArticle.IUpdate,
    });
  typia.assert(furtherUpdatedArticle);

  TestValidator.equals(
    "business status should transition to under_review",
    furtherUpdatedArticle.business_status,
    "under_review",
  );
  TestValidator.equals(
    "publication status should transition to pending_review",
    furtherUpdatedArticle.status,
    "pending_review",
  );

  // Step 9: Validate that non-business fields remain unchanged
  TestValidator.equals(
    "channel reference should remain consistent",
    furtherUpdatedArticle.channel.id,
    initialArticle.channel.id,
  );
  TestValidator.equals(
    "view count should remain at initial value",
    furtherUpdatedArticle.view_count,
    initialArticle.view_count,
  );
  TestValidator.equals(
    "like count should remain at initial value",
    furtherUpdatedArticle.like_count,
    initialArticle.like_count,
  );
  TestValidator.equals(
    "share count should remain at initial value",
    furtherUpdatedArticle.share_count,
    initialArticle.share_count,
  );

  // Step 10: Test error scenario - invalid business status transition
  await TestValidator.error(
    "should reject invalid business status value",
    async () => {
      await api.functional.shoppingMall.seller.articles.update(connection, {
        articleId: furtherUpdatedArticle.id,
        body: {
          business_status: "invalid_status",
        } satisfies IShoppingMallArticle.IUpdate,
      });
    },
  );

  // Step 11: Test error scenario - invalid publication status transition
  await TestValidator.error(
    "should reject invalid publication status value",
    async () => {
      await api.functional.shoppingMall.seller.articles.update(connection, {
        articleId: furtherUpdatedArticle.id,
        body: {
          status: "invalid_status",
        } satisfies IShoppingMallArticle.IUpdate,
      });
    },
  );
}
