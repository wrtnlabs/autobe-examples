import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumThread";

export async function test_api_thread_list_by_category_requires_verification(
  connection: api.IConnection,
) {
  // 1) Administrator signs up
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: "AdminPassw0rd!",
    username: RandomGenerator.alphaNumeric(8).toLowerCase(),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // 2) Administrator creates a category with requires_verification = true
  const categoryBody = {
    name: RandomGenerator.name(),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: "Verification gated category for E2E test",
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

  // 3) Create an unverified registered user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userBody = {
    username: RandomGenerator.alphaNumeric(8).toLowerCase(),
    email: userEmail,
    password: "UserPassw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const unverifiedUser: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userBody,
    });
  typia.assert(unverifiedUser);

  // Optional explicit check: ensure the server reports the user as unverified if present
  if (unverifiedUser.email_verified !== undefined) {
    TestValidator.predicate(
      "newly joined user's email should be unverified by default",
      unverifiedUser.email_verified === false,
    );
  }

  // 4) Unverified user attempts to create a thread in the gated category -> should fail
  const threadAttemptBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
    slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
  } satisfies IEconPoliticalForumThread.ICreate;

  await TestValidator.error(
    "unverified user cannot create thread in verification-gated category",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.threads.create(
        connection,
        {
          body: threadAttemptBody,
        },
      );
    },
  );

  // 5) Verify the registered user's email.
  // Prefer a token provided by the test harness via environment variable for reliability.
  const envToken = (process && (process.env as any)?.TEST_VERIFY_TOKEN) as
    | string
    | undefined;
  const verifyToken: string =
    envToken ?? typia.random<string & tags.MinLength<1>>();

  const verifyResp =
    await api.functional.auth.registeredUser.verify_email.verifyEmail(
      connection,
      {
        body: {
          token: verifyToken,
        } satisfies IEconPoliticalForumRegisteredUser.IVerifyEmail,
      },
    );
  typia.assert(verifyResp);

  // If verification failed in the environment, make the failure explicit so test harness can provide a token.
  if (verifyResp.success !== true) {
    throw new Error(
      "Email verification did not succeed. Provide a valid verification token via TEST_VERIFY_TOKEN or run in simulation mode.",
    );
  }

  // 6) After verification, the user should be able to create a thread
  const createdThread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: threadAttemptBody,
      },
    );
  typia.assert(createdThread);

  // 7) List threads for the category and assert created thread appears
  const page: IPageIEconPoliticalForumThread.ISummary =
    await api.functional.econPoliticalForum.categories.threads.index(
      connection,
      {
        categoryId: category.id,
        body: {
          page: 1,
          limit: 20,
          category_id: category.id,
        } satisfies IEconPoliticalForumThread.IRequest,
      },
    );
  typia.assert(page);

  TestValidator.predicate(
    "created thread appears in category listing",
    page.data.some((t) => t.id === createdThread.id),
  );
}
