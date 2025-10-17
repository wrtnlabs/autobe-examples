import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumPost";

export async function test_api_posts_search_moderator_including_deleted(
  connection: api.IConnection,
) {
  // 1) Administrator signs up and creates a category
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        username: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphabets(8),
          description: null,
          code: null,
          is_moderated: false,
          requires_verification: false,
          order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2) Registered user signs up and creates a thread and a post
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: userEmail,
        password: "UserPass1234",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(user);

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 5,
            wordMax: 10,
          }),
          slug: RandomGenerator.alphabets(10),
          status: "open",
          pinned: false,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 6,
            sentenceMax: 12,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // 3) Moderator signs up and soft-deletes the post
  const modEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: modEmail,
        password: "ModPass1234",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumModerator.ICreate,
    });
  typia.assert(moderator);

  // Soft-delete (moderator action)
  await api.functional.econPoliticalForum.moderator.posts.erase(connection, {
    postId: post.id,
  });

  // 4) Public search (unauthenticated) should NOT return the deleted post
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const publicPage: IPageIEconPoliticalForumPost.ISummary =
    await api.functional.econPoliticalForum.posts.index(unauthConn, {
      body: {
        threadId: thread.id,
      } satisfies IEconPoliticalForumPost.IRequest,
    });
  typia.assert(publicPage);

  TestValidator.predicate(
    "public search excludes soft-deleted post",
    publicPage.data.every((s) => s.id !== post.id),
  );

  // 5) Moderator search (includeDeleted=true) should return the deleted post
  const modPage: IPageIEconPoliticalForumPost.ISummary =
    await api.functional.econPoliticalForum.posts.index(connection, {
      body: {
        threadId: thread.id,
        includeDeleted: true,
      } satisfies IEconPoliticalForumPost.IRequest,
    });
  typia.assert(modPage);

  TestValidator.predicate(
    "moderator search includes soft-deleted post",
    modPage.data.some((s) => s.id === post.id),
  );

  // Note: The index summary DTO does not expose deleted_at in the provided
  // DTO set. Therefore this test verifies presence/absence by id only — it
  // intentionally does not assert deleted_at to maintain strict type safety.
}
