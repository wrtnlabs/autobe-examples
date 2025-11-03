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
 * Test public access to article details without authentication.
 *
 * This test validates the complete public article viewing experience on the
 * politics discussion board. It creates a member account, publishes a
 * politically-focused article with substantial content, generates multi-level
 * comment discussions, and verifies that all content is publicly accessible
 * without authentication requirements.
 *
 * Test Flow:
 *
 * 1. Create member account with random credentials
 * 2. Create approved political article with substantial discussion content
 * 3. Create multiple comments including threaded replies up to 3 levels deep
 * 4. Verify public endpoint returns complete article details without
 *    authentication
 * 5. Validate all response data matches input including title, content, view count
 * 6. Confirm comments are properly organized with threading structure
 */
export async function test_api_article_public_detail_view(
  connection: api.IConnection,
) {
  // Create member account to author political articles
  const joinData = {
    username:
      RandomGenerator.name().replace(/\s+/g, "-").toLowerCase() + "-123",
    email: `${RandomGenerator.alphabets(8)}@politics.test`,
    password: "ValidPassword123",
    ip: "127.0.0.1",
    href: "https://politics.example.com",
    referrer: "https://example.com",
  } satisfies IPoliticsBbsMember.IJoin;

  const member = await api.functional.auth.members.join(connection, {
    body: joinData,
  });
  typia.assert(member);

  // Create approved political article with substantial content
  const articleData = {
    politics_bbs_category_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Economic Policy Reform: Fiscal Responsibility in Modern Government",
    content: RandomGenerator.content({
      paragraphs: 4,
      sentenceMin: 15,
      sentenceMax: 25,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IPoliticsBbsArticle.ICreate;

  const article = await api.functional.politicsBbs.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Create threaded comments on the article
  // Top-level comment
  const firstComment =
    await api.functional.politicsBbs.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "This is an excellent analysis of fiscal policy. The discussion about revenue generation versus spending cuts provides valuable insights into modern economic governance challenges.",
          href: "https://politics.example.com/articles/" + article.id,
          referrer: "https://politics.example.com/articles",
        },
      },
    );
  typia.assert(firstComment);

  // Reply to first comment (depth 1)
  const secondComment =
    await api.functional.politicsBbs.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "I agree with the previous comment. The approach to fiscal responsibility needs to balance immediate economic needs with long-term sustainability.",
          parent_id: firstComment.id,
          href: "https://politics.example.com/articles/" + article.id,
          referrer: "https://politics.example.com/articles",
        },
      },
    );
  typia.assert(secondComment);

  // Reply to second comment (depth 2)
  const thirdComment =
    await api.functional.politicsBbs.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "The previous discussion raises important points about balancing short-term fiscal needs with responsible economic governance principles.",
          parent_id: secondComment.id,
          href: "https://politics.example.com/articles/" + article.id,
          referrer: "https://politics.example.com/articles",
        },
      },
    );
  typia.assert(thirdComment);

  // Test public access to article details
  const publicArticle = await api.functional.politicsBbs.articles.at(
    connection,
    {
      articleId: article.id,
    },
  );
  typia.assert(publicArticle);

  // Validate all article details are publicly accessible
  TestValidator.equals(
    "article title matches",
    publicArticle.title,
    articleData.title,
  );
  TestValidator.equals(
    "article content matches",
    publicArticle.content,
    articleData.content,
  );
  TestValidator.equals(
    "article category matches",
    publicArticle.politics_bbs_category_id,
    articleData.politics_bbs_category_id,
  );
  TestValidator.predicate(
    "view count is positive",
    publicArticle.view_count > 0,
  );
  TestValidator.equals("article ID matches", publicArticle.id, article.id);
  TestValidator.predicate(
    "created at is valid",
    !!publicArticle.created_at.match(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
    ),
  );
  TestValidator.equals(
    "author ID matches",
    publicArticle.politics_bbs_creator_id,
    member.id,
  );

  // Validate threaded comment structure
  const comments = publicArticle.comments || [];
  TestValidator.predicate("has at least 3 comments", comments.length >= 3);

  // Verify comment threading structure
  const topLevelComments = comments.filter((c) => c.parent_id === null);
  TestValidator.predicate(
    "has top-level comments",
    topLevelComments.length > 0,
  );
  TestValidator.equals(
    "first comment at depth 0",
    comments.find((c) => c.id === firstComment.id)?.depth,
    0,
  );
  TestValidator.equals(
    "second comment at depth 1",
    comments.find((c) => c.id === secondComment.id)?.depth,
    1,
  );
  TestValidator.equals(
    "third comment at depth 2",
    comments.find((c) => c.id === thirdComment.id)?.depth,
    2,
  );

  // Verify all comments are present in response
  const commentIds = comments.map((c) => c.id);
  TestValidator.predicate(
    "first comment exists in response",
    commentIds.includes(firstComment.id),
  );
  TestValidator.predicate(
    "second comment exists in response",
    commentIds.includes(secondComment.id),
  );
  TestValidator.predicate(
    "third comment exists in response",
    commentIds.includes(thirdComment.id),
  );
}
