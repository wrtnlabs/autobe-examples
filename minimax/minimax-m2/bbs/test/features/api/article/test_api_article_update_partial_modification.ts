import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_article_update_partial_modification(
  connection: api.IConnection,
) {
  // Step 1: Create registered member account for testing
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: memberEmail,
        bio: "Economic policy researcher interested in market analysis",
        status: "active",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(member);
  TestValidator.equals(
    "member should be created successfully",
    member.email,
    memberEmail,
  );

  // Step 2: Create initial article with comprehensive content
  const initialArticle: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.registeredMember.articles.create(
      connection,
      {
        body: {
          title: "Federal Reserve Policy Impact on Cryptocurrency Markets",
          content:
            "The recent Federal Reserve policy changes have created significant volatility in cryptocurrency markets. Bitcoin and other major cryptocurrencies have experienced substantial price movements following the Fed's interest rate decisions. This analysis examines the correlation between traditional monetary policy and digital asset valuations.",
          category: "Economic Policy",
          status: "published",
          econ_political_discussion_user_id: member.id,
        } satisfies IEconPoliticalDiscussionArticle.ICreate,
      },
    );
  typia.assert(initialArticle);
  TestValidator.equals(
    "article should be created",
    initialArticle.title,
    "Federal Reserve Policy Impact on Cryptocurrency Markets",
  );
  TestValidator.equals(
    "article category should be preserved",
    initialArticle.category,
    "Economic Policy",
  );
  TestValidator.equals(
    "article status should be preserved",
    initialArticle.status,
    "published",
  );
  TestValidator.equals(
    "author ID should match",
    initialArticle.econ_political_discussion_user_id,
    member.id,
  );

  // Store original values for comparison
  const originalTitle = initialArticle.title;
  const originalContent = initialArticle.content;
  const originalCategory = initialArticle.category;
  const originalStatus = initialArticle.status;
  const originalUpdatedAt = initialArticle.updated_at;

  // Step 3: Test partial update - Update only title field
  await new Promise((resolve) => setTimeout(resolve, 100)); // Ensure different timestamp
  const titleOnlyUpdate: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.registeredMember.articles.update(
      connection,
      {
        articleId: initialArticle.id,
        body: {
          title: "Fed Policy Changes and Cryptocurrency Market Volatility",
        } satisfies IEconPoliticalDiscussionArticle.IUpdate,
      },
    );
  typia.assert(titleOnlyUpdate);

  // Verify title was updated and other fields preserved
  TestValidator.equals(
    "title should be updated",
    titleOnlyUpdate.title,
    "Fed Policy Changes and Cryptocurrency Market Volatility",
  );
  TestValidator.equals(
    "content should remain unchanged",
    titleOnlyUpdate.content,
    originalContent,
  );
  TestValidator.equals(
    "category should remain unchanged",
    titleOnlyUpdate.category,
    originalCategory,
  );
  TestValidator.equals(
    "status should remain unchanged",
    titleOnlyUpdate.status,
    originalStatus,
  );
  TestValidator.notEquals(
    "updated_at should be modified",
    titleOnlyUpdate.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "author ID should remain unchanged",
    titleOnlyUpdate.econ_political_discussion_user_id,
    member.id,
  );

  // Step 4: Test partial update - Update only content field
  await new Promise((resolve) => setTimeout(resolve, 100));
  const contentOnlyUpdate: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.registeredMember.articles.update(
      connection,
      {
        articleId: initialArticle.id,
        body: {
          content:
            "Updated analysis: The Federal Reserve's recent monetary policy decisions continue to influence cryptocurrency valuations. This comprehensive study explores the evolving relationship between traditional financial instruments and digital assets, particularly focusing on how Fed policy announcements impact market sentiment and trading volumes across major exchanges.",
        } satisfies IEconPoliticalDiscussionArticle.IUpdate,
      },
    );
  typia.assert(contentOnlyUpdate);

  // Verify content was updated and other fields preserved
  TestValidator.equals(
    "content should be updated",
    contentOnlyUpdate.content,
    "Updated analysis: The Federal Reserve's recent monetary policy decisions continue to influence cryptocurrency valuations. This comprehensive study explores the evolving relationship between traditional financial instruments and digital assets, particularly focusing on how Fed policy announcements impact market sentiment and trading volumes across major exchanges.",
  );
  TestValidator.equals(
    "title should remain from previous update",
    contentOnlyUpdate.title,
    "Fed Policy Changes and Cryptocurrency Market Volatility",
  );
  TestValidator.equals(
    "category should remain unchanged",
    contentOnlyUpdate.category,
    originalCategory,
  );
  TestValidator.equals(
    "status should remain unchanged",
    contentOnlyUpdate.status,
    originalStatus,
  );
  TestValidator.notEquals(
    "updated_at should be modified",
    contentOnlyUpdate.updated_at,
    titleOnlyUpdate.updated_at,
  );
  TestValidator.equals(
    "author ID should remain unchanged",
    contentOnlyUpdate.econ_political_discussion_user_id,
    member.id,
  );

  // Step 5: Test partial update - Update only category field
  await new Promise((resolve) => setTimeout(resolve, 100));
  const categoryOnlyUpdate: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.registeredMember.articles.update(
      connection,
      {
        articleId: initialArticle.id,
        body: {
          category: "Market Discussion",
        } satisfies IEconPoliticalDiscussionArticle.IUpdate,
      },
    );
  typia.assert(categoryOnlyUpdate);

  // Verify category was updated and other fields preserved
  TestValidator.equals(
    "category should be updated",
    categoryOnlyUpdate.category,
    "Market Discussion",
  );
  TestValidator.equals(
    "title should remain from previous update",
    categoryOnlyUpdate.title,
    "Fed Policy Changes and Cryptocurrency Market Volatility",
  );
  TestValidator.equals(
    "content should remain from previous update",
    categoryOnlyUpdate.content,
    "Updated analysis: The Federal Reserve's recent monetary policy decisions continue to influence cryptocurrency valuations. This comprehensive study explores the evolving relationship between traditional financial instruments and digital assets, particularly focusing on how Fed policy announcements impact market sentiment and trading volumes across major exchanges.",
  );
  TestValidator.equals(
    "status should remain unchanged",
    categoryOnlyUpdate.status,
    originalStatus,
  );
  TestValidator.notEquals(
    "updated_at should be modified",
    categoryOnlyUpdate.updated_at,
    contentOnlyUpdate.updated_at,
  );
  TestValidator.equals(
    "author ID should remain unchanged",
    categoryOnlyUpdate.econ_political_discussion_user_id,
    member.id,
  );

  // Step 6: Test partial update - Update multiple fields simultaneously
  await new Promise((resolve) => setTimeout(resolve, 100));
  const multipleFieldsUpdate: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.registeredMember.articles.update(
      connection,
      {
        articleId: initialArticle.id,
        body: {
          title:
            "Central Bank Digital Currencies vs. Traditional Cryptocurrency",
          category: "Political Analysis",
          // Note: content and status are intentionally omitted to test partial updates
        } satisfies IEconPoliticalDiscussionArticle.IUpdate,
      },
    );
  typia.assert(multipleFieldsUpdate);

  // Verify title and category were updated, but content and status preserved
  TestValidator.equals(
    "title should be updated to new value",
    multipleFieldsUpdate.title,
    "Central Bank Digital Currencies vs. Traditional Cryptocurrency",
  );
  TestValidator.equals(
    "category should be updated to new value",
    multipleFieldsUpdate.category,
    "Political Analysis",
  );
  TestValidator.equals(
    "content should remain from previous update",
    multipleFieldsUpdate.content,
    "Updated analysis: The Federal Reserve's recent monetary policy decisions continue to influence cryptocurrency valuations. This comprehensive study explores the evolving relationship between traditional financial instruments and digital assets, particularly focusing on how Fed policy announcements impact market sentiment and trading volumes across major exchanges.",
  );
  TestValidator.equals(
    "status should remain unchanged from original",
    multipleFieldsUpdate.status,
    originalStatus,
  );
  TestValidator.notEquals(
    "updated_at should be modified",
    multipleFieldsUpdate.updated_at,
    categoryOnlyUpdate.updated_at,
  );
  TestValidator.equals(
    "author ID should remain unchanged",
    multipleFieldsUpdate.econ_political_discussion_user_id,
    member.id,
  );

  // Step 7: Test with undefined values (should not update the field)
  await new Promise((resolve) => setTimeout(resolve, 100));
  const undefinedUpdate: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.registeredMember.articles.update(
      connection,
      {
        articleId: initialArticle.id,
        body: {
          content: undefined,
          // Testing that undefined values are treated as "don't update this field"
        } satisfies IEconPoliticalDiscussionArticle.IUpdate,
      },
    );
  typia.assert(undefinedUpdate);
  TestValidator.equals(
    "title should remain from previous update",
    undefinedUpdate.title,
    "Central Bank Digital Currencies vs. Traditional Cryptocurrency",
  );
  TestValidator.equals(
    "content should remain from previous update",
    undefinedUpdate.content,
    "Updated analysis: The Federal Reserve's recent monetary policy decisions continue to influence cryptocurrency valuations. This comprehensive study explores the evolving relationship between traditional financial instruments and digital assets, particularly focusing on how Fed policy announcements impact market sentiment and trading volumes across major exchanges.",
  );
  TestValidator.equals(
    "category should remain from previous update",
    undefinedUpdate.category,
    "Political Analysis",
  );
  TestValidator.equals(
    "status should remain unchanged",
    undefinedUpdate.status,
    originalStatus,
  );
}
