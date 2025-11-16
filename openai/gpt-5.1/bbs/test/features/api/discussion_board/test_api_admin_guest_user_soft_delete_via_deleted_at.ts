import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

export async function test_api_admin_guest_user_soft_delete_via_deleted_at(
  connection: api.IConnection,
) {
  // 1. Admin join: obtain an adminUser session and token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an article category as admin
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3. Member join & login
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Explicit login step for member (even though join already authenticated)
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://board.example.com/login",
    referrer: "https://board.example.com/home",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoginAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 4. Create an article as member in the created category
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 5. Switch back to admin by logging in again (ensures adminUser context)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/home",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 6. Prepare soft-delete payload for a guest user placeholder
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const deletedAtInput: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const updateBody = {
    deleted_at: deletedAtInput,
  } satisfies IDiscussionBoardGuestUser.IUpdate;

  const updatedGuest: IDiscussionBoardGuestUser =
    await api.functional.discussionBoard.adminUser.guestUsers.update(
      connection,
      {
        guestUserId,
        body: updateBody,
      },
    );
  typia.assert(updatedGuest);

  // 7. Validate business expectations around soft delete
  // - Ensure IDs are stable and correctly formatted
  TestValidator.predicate(
    "guest user id should be a non-empty UUID string",
    updatedGuest.id.length > 0,
  );

  TestValidator.predicate(
    "guest user anonymous_token should be non-empty",
    updatedGuest.anonymous_token.length > 0,
  );

  // - created_at and updated_at should be valid ISO date-time strings
  TestValidator.predicate(
    "guest user created_at should be a valid ISO-8601 timestamp",
    () => !Number.isNaN(Date.parse(updatedGuest.created_at)),
  );

  TestValidator.predicate(
    "guest user updated_at should be a valid ISO-8601 timestamp",
    () => !Number.isNaN(Date.parse(updatedGuest.updated_at)),
  );

  // - deleted_at should be either null or a valid ISO timestamp
  if (
    updatedGuest.deleted_at !== null &&
    updatedGuest.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "guest user deleted_at should be a valid ISO-8601 timestamp when set",
      () => !Number.isNaN(Date.parse(updatedGuest.deleted_at!)),
    );
  }

  // - updated_at should not precede created_at
  const createdAtMs = Date.parse(updatedGuest.created_at);
  const updatedAtMs = Date.parse(updatedGuest.updated_at);

  if (!Number.isNaN(createdAtMs) && !Number.isNaN(updatedAtMs)) {
    TestValidator.predicate(
      "updated_at should be greater than or equal to created_at",
      updatedAtMs >= createdAtMs,
    );
  }

  if (
    updatedGuest.deleted_at !== null &&
    updatedGuest.deleted_at !== undefined &&
    !Number.isNaN(createdAtMs)
  ) {
    const deletedAtMs = Date.parse(updatedGuest.deleted_at!);

    if (!Number.isNaN(deletedAtMs)) {
      TestValidator.predicate(
        "deleted_at should be greater than or equal to created_at when not null",
        deletedAtMs >= createdAtMs,
      );
    }
  }
}
