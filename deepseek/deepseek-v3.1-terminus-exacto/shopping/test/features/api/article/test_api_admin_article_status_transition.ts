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
 * Comprehensive validation of article status workflow transitions including
 * draft creation, review submission, publication, and archival processes. Tests
 * business logic for status changes, required field validation during
 * publication, and proper error handling for invalid transitions.
 */
export async function test_api_admin_article_status_transition(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        first_name: "Test",
        last_name: "Administrator",
        role: "super_admin",
        permissions: JSON.stringify({ can_manage_articles: true }),
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create channel for article assignment
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: `test_channel_${RandomGenerator.alphaNumeric(8)}`,
        name: "Test Channel",
        description: "Test channel for article status transition testing",
        status: "active",
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create initial article in draft status
  const draftArticle: IShoppingMallArticle =
    await api.functional.shoppingMall.admin.articles.create(connection, {
      body: {
        actor_type: "administrator",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        subtitle: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        summary: RandomGenerator.paragraph({ sentences: 4 }),
        featured: false,
        allow_comments: true,
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(draftArticle);
  TestValidator.equals(
    "article starts in draft status",
    draftArticle.status,
    "draft",
  );

  // Step 4: Transition from draft to pending_review
  const pendingReviewArticle: IShoppingMallArticle =
    await api.functional.shoppingMall.admin.articles.update(connection, {
      articleId: draftArticle.id,
      body: {
        status: "pending_review",
      } satisfies IShoppingMallArticle.IUpdate,
    });
  typia.assert(pendingReviewArticle);
  TestValidator.equals(
    "status changed to pending_review",
    pendingReviewArticle.status,
    "pending_review",
  );

  // Step 5: Transition from pending_review to published
  const publishedArticle: IShoppingMallArticle =
    await api.functional.shoppingMall.admin.articles.update(connection, {
      articleId: pendingReviewArticle.id,
      body: {
        status: "published",
      } satisfies IShoppingMallArticle.IUpdate,
    });
  typia.assert(publishedArticle);
  TestValidator.equals(
    "status changed to published",
    publishedArticle.status,
    "published",
  );
  TestValidator.predicate(
    "published_at timestamp is set",
    publishedArticle.published_at !== null &&
      publishedArticle.published_at !== undefined,
  );

  // Step 6: Transition from published to archived
  const archivedArticle: IShoppingMallArticle =
    await api.functional.shoppingMall.admin.articles.update(connection, {
      articleId: publishedArticle.id,
      body: {
        status: "archived",
      } satisfies IShoppingMallArticle.IUpdate,
    });
  typia.assert(archivedArticle);
  TestValidator.equals(
    "status changed to archived",
    archivedArticle.status,
    "archived",
  );

  // Step 7: Test invalid status transition (archived back to draft)
  await TestValidator.error(
    "cannot transition from archived to draft",
    async () => {
      await api.functional.shoppingMall.admin.articles.update(connection, {
        articleId: archivedArticle.id,
        body: {
          status: "draft",
        } satisfies IShoppingMallArticle.IUpdate,
      });
    },
  );

  // Step 8: Test invalid status transition (draft directly to archived)
  const newDraftArticle: IShoppingMallArticle =
    await api.functional.shoppingMall.admin.articles.create(connection, {
      body: {
        actor_type: "administrator",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        channel_id: channel.id,
      } satisfies IShoppingMallArticle.ICreate,
    });
  typia.assert(newDraftArticle);

  await TestValidator.error(
    "cannot transition directly from draft to archived",
    async () => {
      await api.functional.shoppingMall.admin.articles.update(connection, {
        articleId: newDraftArticle.id,
        body: {
          status: "archived",
        } satisfies IShoppingMallArticle.IUpdate,
      });
    },
  );

  // Step 9: Verify content integrity throughout transitions
  TestValidator.equals(
    "title remains consistent",
    archivedArticle.title,
    draftArticle.title,
  );
  TestValidator.equals(
    "content remains consistent",
    archivedArticle.content,
    draftArticle.content,
  );
  TestValidator.equals(
    "channel assignment remains consistent",
    archivedArticle.channel.id,
    draftArticle.channel.id,
  );
}
