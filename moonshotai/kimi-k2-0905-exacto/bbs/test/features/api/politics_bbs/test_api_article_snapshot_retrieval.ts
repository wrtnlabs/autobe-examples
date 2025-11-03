import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPoliticsBbsArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticsBbsArticleSnapshot";
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
 * Test retrieval of historical snapshots for politics discussion articles. This
 * test validates that the system correctly captures article modifications by
 * creating multiple snapshots, preserving complete article content including
 * title, content, state, and view count, and provides proper audit trail for
 * content evolution tracking through snapshot retrieval.
 */
export async function test_api_article_snapshot_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for article operations
  const memberJoinBody = {
    username: RandomGenerator.alphaNumeric(8) satisfies string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9-]+$">,
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123" satisfies string & tags.MinLength<8>,
    href: "https://politics-bbs.example.com/join",
    referrer: "https://politics-bbs.example.com/",
  } satisfies IPoliticsBbsMember.IJoin;

  const memberAuth: IPoliticsBbsMember.IAuthorized =
    await api.functional.auth.members.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  // Step 2: Create a category for the articles
  const categoryCreateBody = {
    code: RandomGenerator.alphaNumeric(12) satisfies string,
    name: RandomGenerator.name() satisfies string,
    description: RandomGenerator.paragraph({ sentences: 3 }) satisfies string,
    sequence: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    primary: true,
    required: true,
    multiplicative: false,
  } satisfies IPoliticsBbsCategory.ICreate;

  const category: IPoliticsBbsCategory =
    await api.functional.politicsBbs.moderator.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // Step 3: Create initial article
  const articleCreateBody = {
    politics_bbs_category_id: category.id,
    title: RandomGenerator.name(3) satisfies string &
      tags.MinLength<5> &
      tags.MaxLength<150>,
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 15,
      sentenceMax: 25,
      wordMin: 4,
      wordMax: 8,
    }) satisfies string & tags.MinLength<50> & tags.MaxLength<10000>,
  } satisfies IPoliticsBbsArticle.ICreate;

  const article: IPoliticsBbsArticle =
    await api.functional.politicsBbs.member.articles.create(connection, {
      body: articleCreateBody,
    });
  typia.assert(article);

  // Step 4: Update article to create first snapshot
  const articleUpdateBody1 = {
    title: RandomGenerator.name(4) satisfies string &
      tags.MinLength<5> &
      tags.MaxLength<150>,
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 12,
      sentenceMax: 20,
      wordMin: 5,
      wordMax: 7,
    }) satisfies string & tags.MinLength<50> & tags.MaxLength<10000>,
  } satisfies IPoliticsBbsArticle.IUpdate;

  const updatedArticle1: IPoliticsBbsArticle =
    await api.functional.politicsBbs.member.articles.update(connection, {
      articleId: article.id,
      body: articleUpdateBody1,
    });
  typia.assert(updatedArticle1);

  // Step 5: Update article again to create second snapshot
  const articleUpdateBody2 = {
    title: RandomGenerator.name(2) satisfies string &
      tags.MinLength<5> &
      tags.MaxLength<150>,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 20,
      sentenceMax: 30,
      wordMin: 3,
      wordMax: 9,
    }) satisfies string & tags.MinLength<50> & tags.MaxLength<10000>,
  } satisfies IPoliticsBbsArticle.IUpdate;

  const updatedArticle2: IPoliticsBbsArticle =
    await api.functional.politicsBbs.member.articles.update(connection, {
      articleId: updatedArticle1.id,
      body: articleUpdateBody2,
    });
  typia.assert(updatedArticle2);

  // Step 6: Retrieve snapshots and validate
  const snapshots: IPageIPoliticsBbsArticleSnapshot =
    await api.functional.politicsBbs.articles.snapshots.index(connection, {
      articleId: updatedArticle2.id,
    });
  typia.assert(snapshots);

  // Verify snapshots structure and content
  TestValidator.predicate(
    "snapshots should be an array",
    Array.isArray(snapshots.data),
  );
  TestValidator.predicate(
    "pagination info should be present",
    typeof snapshots.pagination === "object",
  );
  TestValidator.predicate(
    "current page should be valid",
    snapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "records count should match data length",
    snapshots.pagination.records === snapshots.data.length,
  );

  // Validate we have the expected number of snapshots (plus original)
  TestValidator.predicate(
    "should have at least 2 snapshots",
    snapshots.data.length >= 2,
  );

  // Verify each snapshot contains required fields
  snapshots.data.forEach((snapshot, index) => {
    TestValidator.predicate(
      `snapshot ${index} should have ID`,
      typeof snapshot.id === "string" && snapshot.id.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} should have article ID`,
      snapshot.politics_bbs_article_id === updatedArticle2.id,
    );
    TestValidator.predicate(
      `snapshot ${index} should have title`,
      typeof snapshot.title === "string" && snapshot.title.length >= 5,
    );
    TestValidator.predicate(
      `snapshot ${index} should have content`,
      typeof snapshot.content === "string" && snapshot.content.length >= 50,
    );
    TestValidator.predicate(
      `snapshot ${index} should have state`,
      typeof snapshot.state === "string" && snapshot.state.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} should have view count`,
      typeof snapshot.view_count === "number" && snapshot.view_count >= 0,
    );
    TestValidator.predicate(
      `snapshot ${index} should have created timestamp`,
      typeof snapshot.created_at === "string" &&
        snapshot.created_at.includes("-"),
    );
  });

  // Verify chronological order (newest first based on created_at)
  if (snapshots.data.length > 1) {
    for (let i = 0; i < snapshots.data.length - 1; i++) {
      const current = new Date(snapshots.data[i].created_at);
      const next = new Date(snapshots.data[i + 1].created_at);
      TestValidator.predicate(
        `snapshot ${i} should be newer than ${i + 1}`,
        current >= next,
      );
    }
  }

  // Verify content integrity - titles should be different between updates
  const uniqueTitles = new Set(snapshots.data.map((s) => s.title));
  TestValidator.predicate(
    "snapshot titles should be unique",
    uniqueTitles.size >= 2,
  );

  // Verify the latest snapshot matches current article
  const latestSnapshot = snapshots.data[0];
  TestValidator.equals(
    "latest snapshot title matches current article",
    latestSnapshot.title,
    updatedArticle2.title,
  );
  TestValidator.equals(
    "latest snapshot content matches current article",
    latestSnapshot.content,
    updatedArticle2.content,
  );
}
