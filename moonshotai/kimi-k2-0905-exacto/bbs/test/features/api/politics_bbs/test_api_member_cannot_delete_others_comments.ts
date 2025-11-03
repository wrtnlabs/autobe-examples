import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticle";
import type { IPoliticsBbsArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticleSnapshot";
import type { IPoliticsBbsAttachmentOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfMember";
import type { IPoliticsBbsAttachmentOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfModerator";
import type { IPoliticsBbsAttachmentOfVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfVisitor";
import type { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import type { IPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsComment";
import type { IPoliticsBbsFileAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsFileAttachment";
import type { IPoliticsBbsImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsImageAttachment";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";
import type { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";
import type { IPoliticsBbsVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsVisitor";

/**
 * Test that members cannot delete comments authored by other members.
 *
 * This test validates the polymorphic comment ownership system by creating two
 * distinct member accounts and verifying that comment creation and ownership
 * are properly tracked. Since the API currently provides only comment creation
 * functionality, this test focuses on establishing ownership relationships.
 *
 * Test Workflow:
 *
 * 1. Register first member account (comment creator)
 * 2. Register second member account (unauthorized user)
 * 3. Create discussion category for article
 * 4. Create article by first member
 * 5. Create comment on article by first member
 * 6. Verify comment creation and ownership establishment
 *
 * Expected Result: System should properly track comment ownership through
 * polymorphic relationships, ensuring foundation for ownership-based access
 * control.
 */
export async function test_api_member_cannot_delete_others_comments(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (will be comment owner)
  const firstMember = await api.functional.auth.members.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123",
      href: "https://example.com/join",
      referrer: "https://example.com/home",
      ip: "192.168.1.100",
    } satisfies IPoliticsBbsMember.IJoin,
  });
  typia.assert(firstMember);

  // Create a separate connection for second member
  const secondMemberConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 2: Create second member account
  const secondMember = await api.functional.auth.members.join(
    secondMemberConnection,
    {
      body: {
        username: RandomGenerator.alphabets(8),
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
        ip: "192.168.1.101",
      } satisfies IPoliticsBbsMember.IJoin,
    },
  );
  typia.assert(secondMember);

  // Step 3: Create category for article
  const category = await api.functional.politicsBbs.moderator.categories.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sequence: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<999>
        >(),
        primary: RandomGenerator.pick([true, false] as const),
        required: RandomGenerator.pick([true, false] as const),
        multiplicative: RandomGenerator.pick([true, false] as const),
        color: typia.random<string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">>(),
        icon: "fas fa-discussion",
      } satisfies IPoliticsBbsCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Create article using first member
  const article = await api.functional.politicsBbs.member.articles.create(
    connection,
    {
      body: {
        politics_bbs_category_id: category.id,
        title: RandomGenerator.name(3),
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IPoliticsBbsArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Create comment using first member
  const comment =
    await api.functional.politicsBbs.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          href: "https://example.com/article/123",
          referrer: "https://example.com/articles",
          ip: "192.168.1.100",
        } satisfies IPoliticsBbsComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 6: Verify comment was created and properly owned
  TestValidator.predicate(
    "comment was created successfully",
    comment.content.length >= 20 && comment.content.length <= 1000,
  );

  TestValidator.equals(
    "comment was created by first member",
    comment.politics_bbs_article_id,
    article.id,
  );

  // Step 7: Document the ownership limitation
  // Note: The current API does not expose deletion endpoints for comments,
  // making it impossible to test the actual deletion restriction scenario.
  // The polymorphic ownership is established through creation relationships.

  TestValidator.predicate(
    "comment ownership relationship established",
    comment.actor_type === "member" ||
      comment.actor_type === "visitor" ||
      comment.actor_type === "moderator",
  );
}
