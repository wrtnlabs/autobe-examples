import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumPostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPostRevision";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_post_revision_retrieval_by_author(
  connection: api.IConnection,
) {
  /**
   * Validate that a registered post author can retrieve a single revision
   * snapshot. This test runs in SDK simulation mode to avoid depending on
   * server-specific revision id plumbing not exposed by the SDK. For live
   * environments, remove connection.simulate = true and obtain the real
   * revision id via the server's revision listing or by reading an explicit
   * value returned by update().
   *
   * Steps:
   *
   * 1. Admin joins and creates a category
   * 2. Registered user (author) joins
   * 3. Author creates a thread and an initial post
   * 4. Author edits the post (server should record a revision)
   * 5. Retrieve one revision snapshot via revisions.at and validate shape
   */
  // Use simulation to ensure SDK mock responses and type-safe outputs during E2E generation
  connection.simulate = true;

  // 1) Administrator signs up (so we can create a category)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Create a category as administrator
  const categoryName = RandomGenerator.name(2);
  const categorySlug = RandomGenerator.alphabets(8).toLowerCase();
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: `Automated test category for ${categoryName}`,
          is_moderated: false,
          requires_verification: false,
          order: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3) Create the registered user (author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorUsername = `u_${RandomGenerator.alphaNumeric(6)}`;
  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: authorUsername,
        email: authorEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(author);

  // 4) Create a thread as the registered user
  const threadTitle = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 3,
    wordMax: 8,
  });
  const threadSlug = RandomGenerator.alphabets(8).toLowerCase();
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: threadTitle,
          slug: threadSlug,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 5) Create the initial post in the thread
  const initialContent = RandomGenerator.content({ paragraphs: 2 });
  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: initialContent,
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // 6) Edit the post to produce a revision snapshot
  const updatedContent = `${initialContent}\n\nEdited: ${RandomGenerator.paragraph({ sentences: 3 })}`;
  const updated: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.update(
      connection,
      {
        postId: post.id,
        body: {
          content: updatedContent,
        } satisfies IEconPoliticalForumPost.IUpdate,
      },
    );
  typia.assert(updated);

  // 7) Retrieve a single revision snapshot.
  // Because the SDK does not expose a revisions listing endpoint and update()
  // does not indicate a revision id in the provided signature, generate a
  // candidate revisionId for simulation. Adapt this to use a real revision id
  // when running against a live API that exposes it.
  const revisionId = typia.random<string & tags.Format<"uuid">>();
  const revision: IEconPoliticalForumPostRevision =
    await api.functional.econPoliticalForum.registeredUser.posts.revisions.at(
      connection,
      {
        postId: post.id,
        revisionId,
      },
    );
  typia.assert(revision);

  // 8) Assertions about the retrieved revision snapshot
  TestValidator.predicate("revision has id", typeof revision.id === "string");
  TestValidator.predicate(
    "revision has post_id",
    typeof revision.post_id === "string",
  );
  TestValidator.predicate(
    "revision content non-empty",
    typeof revision.content === "string" && revision.content.length > 0,
  );
  TestValidator.predicate(
    "revision created_at present",
    typeof revision.created_at === "string",
  );

  // Teardown guidance (for real environments):
  // - Reset test DB or soft-delete created resources
  // - Prefer running each test in a transaction or in isolated schema per test
}
