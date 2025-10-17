import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumLegalHold";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumLegalHold";

export async function test_api_legal_hold_list_for_post_forbidden_to_regular_user(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Confirm that non-administrator registered users cannot access the
   *   administrator-only legal-hold listing for a specific post. Test both an
   *   authenticated regular user and an unauthenticated request.
   *
   * Summary of steps implemented below (in code):
   *
   * 1. Create an administrator and use it to create a category.
   * 2. Create two registered users (userA, userB).
   * 3. Using userA, create a thread in the category and then create a post.
   * 4. Using userB (regular user), attempt to call the administrator endpoint to
   *    list legal holds for the post and expect 401/403.
   * 5. Using an anonymous connection (no Authorization), attempt the same and
   *    expect 401/403.
   */

  // 1. Administrator registration & category creation
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPass!23",
        username: RandomGenerator.alphaNumeric(8).toLowerCase(),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      adminConn,
      {
        body: {
          name: `test-category-${RandomGenerator.alphaNumeric(6)}`,
          slug: `cat-${RandomGenerator.alphaNumeric(8).toLowerCase()}`,
          description: "Category for legal-hold access control test",
          is_moderated: false,
          requires_verification: false,
          order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Create two registered users (userA and userB)
  const userAConn: api.IConnection = { ...connection, headers: {} };
  const userAAuth: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(userAConn, {
      body: {
        username: `usera_${RandomGenerator.alphaNumeric(6)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: "UserPass!23",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(userAAuth);

  const userBConn: api.IConnection = { ...connection, headers: {} };
  const userBAuth: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(userBConn, {
      body: {
        username: `userb_${RandomGenerator.alphaNumeric(6)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: "UserPass!23",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(userBAuth);

  // 3. UserA creates a thread and a post
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      userAConn,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: `thr-${RandomGenerator.alphaNumeric(8).toLowerCase()}`,
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  const post: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      userAConn,
      {
        body: {
          thread_id: thread.id,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
        } satisfies IEconPoliticalForumPost.ICreate,
      },
    );
  typia.assert(post);

  // 4. Attempt to list legal holds with userB (regular user) -> expect 401/403
  await TestValidator.httpError(
    "regular user cannot list legal holds (authenticated)",
    [401, 403],
    async () => {
      await api.functional.econPoliticalForum.administrator.posts.legalHolds.index(
        userBConn,
        { postId: post.id },
      );
    },
  );

  // 5. Attempt to list legal holds with no authorization -> expect 401/403
  const anonymousConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.httpError(
    "anonymous request cannot list legal holds (unauthenticated)",
    [401, 403],
    async () => {
      await api.functional.econPoliticalForum.administrator.posts.legalHolds.index(
        anonymousConn,
        { postId: post.id },
      );
    },
  );

  // Final: basic sanity assertion that the post exists and relates to thread
  TestValidator.equals(
    "post belongs to created thread",
    post.thread_id,
    thread.id,
  );
}
