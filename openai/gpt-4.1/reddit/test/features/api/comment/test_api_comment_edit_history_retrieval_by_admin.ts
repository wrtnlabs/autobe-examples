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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentEditHistory";

/**
 * Validate that an administrator can audit the full edit history of any user's
 * comment.
 *
 * Steps:
 *
 * 1. Register a community admin account.
 * 2. Register a normal user account used for comments.
 * 3. As the user, create a new community.
 * 4. As the user, create a post in the community.
 * 5. As the user, create a comment in the post.
 * 6. Edit the comment several times (simulate content changes).
 * 7. Switch to the admin context.
 * 8. Retrieve the complete edit history for the comment as the admin.
 * 9. Validate that the edit history contains all intermediate versions of the
 *    comment in expected order and with correct content.
 */
export async function test_api_comment_edit_history_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminRes = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string,
      display_name: RandomGenerator.name(),
      href: "https://admin-join.example.com/",
      referrer: "https://referrer.example.com/",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminRes);
  // Do not forget, SDK automatically swaps context after admin join.

  // 2. Register user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);
  const userRes = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      display_name: RandomGenerator.name(),
      href: "https://user-join.example.com/",
      referrer: "https://referrer.example.com/",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userRes);

  // 3. As the user, create a community
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(8),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 4. As the user, create a post
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        text_body: RandomGenerator.paragraph({ sentences: 10 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. As user, comment on the post
  const initialCommentBody = RandomGenerator.paragraph({ sentences: 3 });
  let comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        body: initialCommentBody,
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 6. Edit the comment multiple times
  const editBodies: string[] = [
    RandomGenerator.paragraph({ sentences: 4 }),
    RandomGenerator.paragraph({ sentences: 2 }),
    RandomGenerator.paragraph({ sentences: 5 }),
  ];
  for (const body of editBodies) {
    comment = await api.functional.communityPlatform.user.comments.update(
      connection,
      {
        commentId: comment.id,
        body: {
          body,
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
    typia.assert(comment);
  }

  // 7. Switch back to admin context
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string,
      display_name: adminRes.display_name,
      href: "https://admin-login.example.com/",
      referrer: "https://referrer.example.com/",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // 8. Retrieve comment edit history as admin (should see all edits)
  const editHistoryPage =
    await api.functional.communityPlatform.admin.comments.editHistories.index(
      connection,
      {
        commentId: comment.id,
        body: {
          order_by: "asc",
          page: 0,
          limit: 100,
        } satisfies ICommunityPlatformCommentEditHistory.IRequest,
      },
    );
  typia.assert(editHistoryPage);

  // 9. Validate that history matches changes
  // The system is append-only and should track all edits with prior bodies chronologically.
  // The original content should be present in the first edit record (as prior_body),
  // and each edit record represents the comment body *before* that change.
  // The total number of edit records equals the number of edits performed.
  TestValidator.equals(
    "edit history length matches number of edits",
    editHistoryPage.data.length,
    editBodies.length,
  );
  ArrayUtil.repeat(editBodies.length, (i) => {
    TestValidator.equals(
      `edit history prior_body matches edit ${i}`,
      editHistoryPage.data[i].prior_body,
      i === 0 ? initialCommentBody : editBodies[i - 1],
    );
  });
}
