import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumBookmark";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_bookmark_delete_not_found_when_already_deleted(
  connection: api.IConnection,
) {
  // 1) Administrator signs up (creates admin token on connection)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "P@ssw0rd1234",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) As admin, create a category
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          code: null,
          name: RandomGenerator.name(2),
          slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_moderated: false,
          requires_verification: false,
          order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3) Registered user (owner) signs up — this will set connection.headers to owner's token
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const owner: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: ownerEmail,
        password: "P@ssw0rd1234",
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(owner);

  // 4) Owner creates a thread in the created category
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: `thread-${RandomGenerator.alphaNumeric(6)}`,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 5) Owner creates a post in that thread
  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 12,
          }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // 6) Owner creates a bookmark for the post
  const bookmark: IEconPoliticalForumBookmark =
    await api.functional.econPoliticalForum.registeredUser.bookmarks.create(
      connection,
      {
        body: {
          post_id: post.id,
        } satisfies IEconPoliticalForumBookmark.ICreate,
      },
    );
  typia.assert(bookmark);

  // 7) First delete — expected to succeed (204 semantics). The SDK erase() returns void on success.
  await api.functional.econPoliticalForum.registeredUser.bookmarks.erase(
    connection,
    {
      bookmarkId: bookmark.id,
    },
  );
  // Success if no exception thrown
  TestValidator.predicate("first delete succeeded (no exception)", true);

  // 8) Second delete — per documented contract the API returns 404 for already-deleted resources.
  await TestValidator.httpError(
    "second delete on already-deleted bookmark should return 404",
    404,
    async () =>
      await api.functional.econPoliticalForum.registeredUser.bookmarks.erase(
        connection,
        { bookmarkId: bookmark.id },
      ),
  );

  // NOTE: Direct DB verification of deleted_at cannot be performed using only
  // the provided SDK because no bookmark retrieval endpoint is included. To
  // assert deleted_at remains set and unchanged, add a GET bookmark endpoint
  // to the SDK or perform a DB-level integration check outside of this E2E
  // test harness.
}
