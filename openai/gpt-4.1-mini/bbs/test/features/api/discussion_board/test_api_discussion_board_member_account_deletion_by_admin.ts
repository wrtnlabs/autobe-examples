import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_member_account_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Member joins and authenticates
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "memberPassword123",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 3. As authenticated member, create an article
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "memberPassword123",
    } satisfies IDiscussionBoardMember.ICreate,
  }); // Refresh member token in connection.headers

  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 9 }),
    content_markdown: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    discussion_board_attachments: [
      {
        filename: `${RandomGenerator.name(1)}.png`,
        file_type: "image/png",
        file_url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(12)}.png`,
      },
    ],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  // 4. Switch back to admin by re-authenticating admin user
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "securePassword123",
    } satisfies IDiscussionBoardAdmin.IJoin,
  }); // Refresh admin token in connection.headers

  // 5. Try to delete the member account by member user to verify unauthorized usage
  // Create a separate connection to simulate member context if needed
  // But given test context, assume current 'connection' is admin now
  // Thus, perform unauthorized deletion checking with explicit error validation

  const unauthorizedConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized user cannot delete member account",
    async () => {
      // Attempt to delete a random member ID without admin token
      await api.functional.discussionBoard.admin.discussionBoardMembers.erase(
        unauthorizedConn,
        {
          discussionBoardMemberId: member.id,
        },
      );
    },
  );

  // 6. Now perform the deletion with admin connection
  await api.functional.discussionBoard.admin.discussionBoardMembers.erase(
    connection,
    {
      discussionBoardMemberId: member.id,
    },
  );
}
