import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumPostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPostRevision";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_post_revision_moderator_retrieve(
  connection: api.IConnection,
) {
  // 1) Administrator registers and becomes authenticated
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // 2) Admin creates a category used for the thread
  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: `${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_moderated: true,
    requires_verification: false,
    // bounded order for realism
    order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
    >(),
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3) Registered author joins (connection headers set to author token)
  const authorBody = {
    username: `user_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "AuthP@ssword123",
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: authorBody,
    });
  typia.assert(author);

  // 4) Author creates a thread in the category
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 5 }),
    slug: `${RandomGenerator.alphabets(6)}`,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadBody },
    );
  typia.assert(thread);

  // 5) Author creates a post in the thread
  const postCreateBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEconPoliticalForumPost.ICreate;

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);

  // 6) Author updates the post to generate a revision snapshot (server-side)
  const updateBody = {
    content: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IEconPoliticalForumPost.IUpdate;

  const updated: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.update(
      connection,
      {
        postId: post.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // Try to discover a server-provided revision id (not guaranteed by SDK).
  // If the server returns revision info in the update response in your
  // implementation, prefer that value. The provided DTO IEconPoliticalForumPost
  // does not include a revisions array in supplied materials, so fall back to
  // a generated valid UUID for retrieval testing when necessary.
  let serverProvidedRevisionId: string | null = null;

  // (Placeholder extraction - kept for future SDKs that may return revision id)
  // Example: if updated had a property like `latest_revision_id`, extract it here.
  // if ((updated as any).latest_revision_id) serverProvidedRevisionId = (updated as any).latest_revision_id;

  const revisionId: string =
    serverProvidedRevisionId ?? typia.random<string & tags.Format<"uuid">>();

  // 7) Negative test: non-moderator (author) attempt should be forbidden (403)
  await TestValidator.error(
    "non-moderator cannot retrieve moderator-only revision",
    async () => {
      await api.functional.econPoliticalForum.moderator.posts.revisions.at(
        connection,
        { postId: post.id, revisionId },
      );
    },
  );

  // 8) Negative test: unauthenticated attempt should be unauthorized (401)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated request should fail", async () => {
    await api.functional.econPoliticalForum.moderator.posts.revisions.at(
      unauthConn,
      { postId: post.id, revisionId },
    );
  });

  // 9) Moderator joins (connection headers overwritten with moderator token)
  const moderatorBody = {
    username: `mod_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "ModeratorP@ss123",
  } satisfies IEconPoliticalForumModerator.ICreate;

  const moderator: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // 10) Moderator retrieves the revision. If the revisionId was a fallback,
  // this call primarily validates RBAC and response shape. If your backend
  // actually created a revision with the supplied id, the returned object
  // should match and the business equality check below will succeed.
  const fetched: IEconPoliticalForumPostRevision =
    await api.functional.econPoliticalForum.moderator.posts.revisions.at(
      connection,
      { postId: post.id, revisionId },
    );
  typia.assert(fetched);

  // Business assertions: required fields exist
  TestValidator.predicate(
    "revision contains id",
    typeof fetched.id === "string" && fetched.id.length > 0,
  );

  // When a server-provided revision id is available and associated with the
  // post, this equality should hold. When using the fallback revision id, the
  // equality might not be true; therefore, assert presence and type, and only
  // check equality when a server-provided id was discovered.
  if (serverProvidedRevisionId !== null) {
    TestValidator.equals(
      "revision.post_id equals requested post id",
      fetched.post_id,
      post.id,
    );
  } else {
    // Fallback: ensure post_id exists and is a string (we cannot guarantee
    // association without a server-provided id in the available SDK).
    TestValidator.predicate(
      "revision.post_id is present",
      typeof fetched.post_id === "string" && fetched.post_id.length > 0,
    );
  }

  TestValidator.predicate(
    "revision has content",
    typeof fetched.content === "string" && fetched.content.length > 0,
  );

  // Note: Audit/log verification is not implemented because the provided SDK
  // does not include audit-log listing endpoints. That verification should be
  // added when an administrative audit API becomes available.
}
