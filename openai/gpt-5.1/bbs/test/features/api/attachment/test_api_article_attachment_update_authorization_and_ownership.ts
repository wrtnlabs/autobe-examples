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
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Verify authorization and ownership rules when updating article attachments.
 *
 * Business goal:
 *
 * - Only the article-owning member user can update an attachment through the
 *   memberUser endpoint.
 * - Authenticated non-owners must be rejected when attempting to update an
 *   attachment on someone else's article.
 * - Unauthenticated requests must also be rejected.
 * - A legitimate owner update must succeed so we know the endpoint works
 *   correctly when properly authorized.
 *
 * High-level flow:
 *
 * 1. Join member user A and implicitly authenticate them.
 * 2. Join admin user and create an article category.
 * 3. Switch to member A and create an article in that category.
 * 4. Member A creates an attachment for that article.
 * 5. Join member user B so that Authorization reflects a different user.
 * 6. As member B, attempt to update the attachment belonging to A's article and
 *    expect an authorization/permission error.
 * 7. Switch back to member A and perform a successful update of the same
 *    attachment, asserting that:
 *
 *    - The call succeeds.
 *    - The attachment id and article id remain the same.
 *    - The editable metadata fields are updated as requested.
 * 8. Finally, attempt to update the attachment using an unauthenticated connection
 *    (no Authorization header) and assert that this also fails.
 */
export async function test_api_article_attachment_update_authorization_and_ownership(
  connection: api.IConnection,
) {
  // 1. Register member user A (owner) via join and authenticate
  const memberAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberAJoinBody = {
    email: memberAEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: "127.0.0.1",
    href: "https://frontend.local/join/memberA",
    referrer: "https://frontend.local/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberA: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. Register admin user and authenticate
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(20),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.2",
    href: "https://frontend.local/admin/join",
    referrer: "https://frontend.local/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Create an article category as admin
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 4. Switch back to member A (ensure Authorization for member A)
  const memberALoginBody = {
    email: memberAEmail,
    password: memberAJoinBody.password,
    ip: "127.0.0.1",
    href: "https://frontend.local/login/memberA",
    referrer: "https://frontend.local/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberALogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  // 5. Member A creates an article in the created category
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

  // 6. Member A creates an attachment for the article
  const attachmentCreateBody = {
    file_uri: typia.random<string & tags.Format<"uri">>(),
    file_name: `file_${RandomGenerator.alphaNumeric(8)}.txt`,
    content_type: "text/plain",
    file_size: 1024 as number & tags.Type<"int32"> & tags.Minimum<0>,
    order_in_article: 0 as number & tags.Type<"int32">,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(attachment);

  // 7. Join member user B and authenticate as B
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberBJoinBody = {
    email: memberBEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: "127.0.0.3",
    href: "https://frontend.local/join/memberB",
    referrer: "https://frontend.local/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberB: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 8. As member B, attempt to update A's attachment and expect failure
  const unauthorizedUpdateBodyByB = {
    file_name: `unauthorized_${RandomGenerator.alphaNumeric(6)}.txt`,
    content_type: "text/markdown",
    order_in_article: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    status: "hidden",
  } satisfies IDiscussionBoardAttachment.IUpdate;

  await TestValidator.error(
    "unauthorized member B cannot update attachment owned by member A",
    async () => {
      await api.functional.discussionBoard.memberUser.articles.attachments.update(
        connection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
          body: unauthorizedUpdateBodyByB,
        },
      );
    },
  );

  // 9. Switch back to member A and perform a successful update
  const memberALoginAgainBody = {
    email: memberAEmail,
    password: memberAJoinBody.password,
    ip: "127.0.0.1",
    href: "https://frontend.local/login/memberA/again",
    referrer: "https://frontend.local/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberALoginAgain: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginAgainBody,
    });
  typia.assert(memberALoginAgain);

  const ownerUpdateBody = {
    file_name: `owner_updated_${RandomGenerator.alphaNumeric(6)}.txt`,
    content_type: "text/plain",
    order_in_article: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    status: "active",
  } satisfies IDiscussionBoardAttachment.IUpdate;

  const updatedByOwner: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.update(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: ownerUpdateBody,
      },
    );
  typia.assert(updatedByOwner);

  // Validate that core identity fields remain stable
  TestValidator.equals(
    "attachment id remains unchanged after owner update",
    updatedByOwner.id,
    attachment.id,
  );
  TestValidator.equals(
    "attachment's article id remains unchanged after owner update",
    updatedByOwner.discussion_board_article_id,
    attachment.discussion_board_article_id,
  );

  // Validate that editable fields reflect the owner's update request
  TestValidator.equals(
    "file_name updated by owner",
    updatedByOwner.file_name,
    ownerUpdateBody.file_name,
  );
  TestValidator.equals(
    "content_type updated by owner",
    updatedByOwner.content_type,
    ownerUpdateBody.content_type,
  );
  TestValidator.equals(
    "order_in_article updated by owner",
    updatedByOwner.order_in_article,
    ownerUpdateBody.order_in_article,
  );
  TestValidator.equals(
    "status updated by owner",
    updatedByOwner.status,
    ownerUpdateBody.status,
  );

  // 10. Attempt to update attachment without authentication and expect failure
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const unauthenticatedUpdateBody = {
    file_name: `unauthenticated_${RandomGenerator.alphaNumeric(6)}.txt`,
    content_type: "text/plain",
    order_in_article: 3 as number & tags.Type<"int32"> & tags.Minimum<0>,
    status: "hidden",
  } satisfies IDiscussionBoardAttachment.IUpdate;

  await TestValidator.error(
    "unauthenticated client cannot update attachment",
    async () => {
      await api.functional.discussionBoard.memberUser.articles.attachments.update(
        unauthenticatedConnection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
          body: unauthenticatedUpdateBody,
        },
      );
    },
  );
}
