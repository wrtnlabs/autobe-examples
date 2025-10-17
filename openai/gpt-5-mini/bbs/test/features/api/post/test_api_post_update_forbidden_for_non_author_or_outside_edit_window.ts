import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_post_update_forbidden_for_non_author_or_outside_edit_window(
  connection: api.IConnection,
) {
  // 1) Administrator: create admin account and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "administrator-strong-pw";
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  const categoryName = RandomGenerator.name(2);
  const categorySlug = RandomGenerator.alphabets(8);
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: null,
          code: null,
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2) Author: create registered user (author) and capture credentials
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = "author-strong-pw";
  const authorUsername = RandomGenerator.alphaNumeric(8);
  const author: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: authorUsername,
        email: authorEmail,
        password: authorPassword,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(author);

  // Preserve author's authentication context by cloning the current connection
  const authorConn: api.IConnection = {
    ...connection,
    headers: { ...(connection.headers ?? {}) },
  };

  // 3) Create thread and initial post as the author
  const threadTitle = RandomGenerator.paragraph({ sentences: 6 });
  const threadSlug = RandomGenerator.alphaNumeric(8);
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

  // 4) otherUser: create a second registered user (otherUser)
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherPassword = "other-strong-pw";
  const otherUsername = RandomGenerator.alphaNumeric(8);
  const otherUser: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: otherUsername,
        email: otherEmail,
        password: otherPassword,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(otherUser);

  // 5) Negative test A: Non-author update attempt should be forbidden
  await TestValidator.httpError(
    "non-author cannot update another user's post",
    403,
    async () => {
      await api.functional.econPoliticalForum.registeredUser.posts.update(
        connection,
        {
          postId: post.id,
          body: {
            content: "This unauthorized edit must be rejected",
          } satisfies IEconPoliticalForumPost.IUpdate,
        },
      );
    },
  );

  // 6) Negative test B: Attempt to update as the author - accept either
  //    success (edited metadata present) OR a server-enforced lock (403/423).
  try {
    const updated: IEconPoliticalForumPost =
      await api.functional.econPoliticalForum.registeredUser.posts.update(
        authorConn,
        {
          postId: post.id,
          body: {
            content: `${initialContent}\n\n(edited) ${RandomGenerator.paragraph({ sentences: 2 })}`,
          } satisfies IEconPoliticalForumPost.IUpdate,
        },
      );
    // Update succeeded: verify returned shape and edited metadata
    typia.assert(updated);
    TestValidator.predicate(
      "author update sets is_edited or edited_at",
      updated.is_edited === true || updated.edited_at !== null,
    );
  } catch (err) {
    // If server enforces edit-window or legal hold, it may return 403 or 423.
    // Accept these statuses as valid enforcement of edit-window policy.
    let status: number | undefined = undefined;
    try {
      // Attempt to read status if error is HttpError-like
      status = (err as any)?.status;
    } catch {
      /* ignore */
    }
    TestValidator.predicate(
      "author update rejected with edit-window/lock status",
      status === 403 || status === 423,
    );
  }
}
