import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentEditHistory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that only admins can create comment edit histories via the admin
 * endpoint.
 *
 * Steps:
 *
 * 1. Register as an admin and as a normal user
 * 2. As user, create a community
 * 3. As user, create a post in the community (as text post)
 * 4. As user, make a comment on the post
 * 5. While authenticated as user, attempt to append an admin edit history for the
 *    comment (expect failure)
 * 6. While authenticated as admin, append an edit history for the comment (expect
 *    success)
 */
export async function test_api_admin_comment_edit_history_creation_permissions(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        href: "https://admin-join.test/",
        referrer: "https://admin-join.test/referrer",
        ip: undefined,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(12);
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(),
        href: "https://user-join.test/",
        referrer: "https://user-join.test/referrer",
        ip: undefined,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // Now, connection session is for the user

  // 3. User creates a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 4. User creates a text post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        text_body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 18,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 5. User posts a comment
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.user.comments.create(connection, {
      body: {
        post_id: post.id,
        body: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // 6. As user (non-admin), attempt to append edit history via admin endpoint (should fail)
  await TestValidator.error(
    "only admin can append edit history via admin endpoint",
    async () => {
      await api.functional.communityPlatform.admin.comments.editHistories.create(
        connection,
        {
          commentId: comment.id,
          body: {
            prior_body: comment.body,
            edit_reason: "Attempt by non-admin",
          } satisfies ICommunityPlatformCommentEditHistory.ICreate,
        },
      );
    },
  );

  // 7. Switch session to admin (re-authenticate via admin.join)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: admin.display_name,
      href: "https://admin-join.test/login",
      referrer: "https://admin-join.test/referrer-login",
      ip: undefined,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // 8. As admin, append edit history for the comment
  const editHistory: ICommunityPlatformCommentEditHistory =
    await api.functional.communityPlatform.admin.comments.editHistories.create(
      connection,
      {
        commentId: comment.id,
        body: {
          prior_body: comment.body,
          edit_reason: "Moderator correction applied.",
        } satisfies ICommunityPlatformCommentEditHistory.ICreate,
      },
    );
  typia.assert(editHistory);

  TestValidator.equals(
    "edit history references original comment and prior content",
    editHistory.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "edit history's prior_body matches original comment body",
    editHistory.prior_body,
    comment.body,
  );
}
