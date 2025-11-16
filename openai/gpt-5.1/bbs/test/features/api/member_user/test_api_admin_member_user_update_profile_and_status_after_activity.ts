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
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

export async function test_api_admin_member_user_update_profile_and_status_after_activity(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 5 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://frontend.example.com/signup/member",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const originalMemberId = memberAuthorized.id;
  const originalCreatedAt = memberAuthorized.created_at;
  const originalUpdatedAt = memberAuthorized.updated_at;

  // 2. Register a new admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminPasswordFormatted: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPasswordFormatted,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://frontend.example.com/admin/signup",
    referrer: "https://frontend.example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorizedOnJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedOnJoin);

  // 3. Create a new article category as admin
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  const categoryId = category.id;

  // 4. Switch to member user via login
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://frontend.example.com/login/member",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberAuthorizedOnLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedOnLogin);

  // 5. Member creates an article using the created category
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    categoryId,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  TestValidator.equals(
    "article category matches created category",
    article.category.id,
    categoryId,
  );

  // 6. Switch back to admin via login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://frontend.example.com/admin/login",
    referrer: "https://frontend.example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminAuthorizedOnLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedOnLogin);

  // 7. Admin updates the member user's profile and account status
  const updatedDisplayName = RandomGenerator.name(2);
  const updatedBio = RandomGenerator.paragraph({ sentences: 3 });
  const updatedLocation = RandomGenerator.paragraph({ sentences: 2 });
  const updatedEmailVerified = !memberAuthorized.email_verified;
  const updatedAccountStatus =
    memberAuthorized.account_status === "active"
      ? "suspended"
      : `${memberAuthorized.account_status}_updated`;

  const updateBody = {
    display_name: updatedDisplayName,
    bio: updatedBio,
    location: updatedLocation,
    email_verified: updatedEmailVerified,
    account_status: updatedAccountStatus,
  } satisfies IDiscussionBoardMemberuser.IUpdate;

  const updatedMember: IDiscussionBoardMemberuser =
    await api.functional.discussionBoard.adminUser.memberUsers.update(
      connection,
      {
        memberUserId: originalMemberId,
        body: updateBody,
      },
    );
  typia.assert(updatedMember);

  // 8. Business validations
  TestValidator.equals(
    "member id should remain unchanged after admin update",
    updatedMember.id,
    originalMemberId,
  );

  TestValidator.equals(
    "display_name should be updated to new value",
    updatedMember.display_name,
    updatedDisplayName,
  );

  TestValidator.equals(
    "bio should be updated to new value",
    updatedMember.bio,
    updatedBio,
  );

  TestValidator.equals(
    "location should be updated to new value",
    updatedMember.location,
    updatedLocation,
  );

  TestValidator.equals(
    "email_verified should reflect updated flag",
    updatedMember.email_verified,
    updatedEmailVerified,
  );

  TestValidator.equals(
    "account_status should reflect updated status",
    updatedMember.account_status,
    updatedAccountStatus,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedMember.created_at,
    originalCreatedAt,
  );

  TestValidator.notEquals(
    "updated_at should be refreshed after update",
    updatedMember.updated_at,
    originalUpdatedAt,
  );
}
