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

export async function test_api_post_creation_requires_email_verification(
  connection: api.IConnection,
) {
  // 1. Administrator signs up (creates admin account and acquires admin token)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "Password12345",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2. Admin creates a category that requires email verification for posting
  const categoryBody = {
    code: null,
    name: `verify-${RandomGenerator.alphabets(6)}`,
    slug: `verify-${RandomGenerator.alphaNumeric(8)}`,
    description: "Category gated by email verification for posting",
    is_moderated: false,
    requires_verification: true,
    order: 1,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Create a thread in that category while the connection is still using admin's token
  const threadBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 5, wordMax: 8 }),
    slug: `thread-${RandomGenerator.alphaNumeric(8)}`,
    status: "open",
    pinned: false,
  } satisfies IEconPoliticalForumThread.ICreate;

  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      { body: threadBody },
    );
  typia.assert(thread);

  // 4. Register a new user (email_verified will be false initially)
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword = "UserPass!234";
  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(user);

  // Save user id for later assertions
  const userId = user.id;

  // 5. Attempt to create a post in the verification-gated category/thread as the UNVERIFIED user
  const postAttemptBody = {
    thread_id: thread.id,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 18,
    }),
  } satisfies IEconPoliticalForumPost.ICreate;

  await TestValidator.error(
    "unverified user cannot create post in requires_verification category",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.posts.create(
        connection,
        { body: postAttemptBody },
      );
    },
  );

  // 6. Simulate email verification for the user (test environment)
  const verifyBody = {
    token: typia.random<string & tags.MinLength<1>>(),
  } satisfies IEconPoliticalForumRegisteredUser.IVerifyEmail;

  const verifyResult: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.verify_email.verifyEmail(
      connection,
      { body: verifyBody },
    );
  typia.assert(verifyResult);

  // Ensure the verification returned success flag
  TestValidator.predicate(
    "email verification indicates success",
    verifyResult.success === true,
  );

  // 7. Retry creating the post after verification - should succeed
  const createdPost: IEconPoliticalForumPost =
    await api.functional.econPoliticalForum.registeredUser.posts.create(
      connection,
      { body: postAttemptBody },
    );
  typia.assert(createdPost);

  // Business assertions: author and thread must match expected values
  TestValidator.equals(
    "created post author matches registered user",
    createdPost.author_id,
    userId,
  );
  TestValidator.equals(
    "created post belongs to expected thread",
    createdPost.thread_id,
    thread.id,
  );

  // Teardown note: Test harness should reset DB between tests. If desired,
  // tests may call administrative cleanup endpoints here (not available in SDK).
}
