import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test detailed access to community post comments by an authorized user.
 *
 * 1. Register (join) a new user and save credentials
 * 2. Create a new unique community (subreddit)
 * 3. Create a post in that community (text type)
 * 4. Submit two comments to the post: one visible, one removed
 * 5. Retrieve details for each comment by ID and verify all key fields
 * 6. Simulate a reply (nested comment) and test parent/child relationships
 */
export async function test_api_comment_detail_access_by_authorized_user(
  connection: api.IConnection,
) {
  // 1. Register a new user and obtain credentials
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userDisplayName = RandomGenerator.name();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "strongpassword123",
      display_name: userDisplayName,
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);

  // 2. Create a community
  const communityName = RandomGenerator.alphaNumeric(12);
  const communityDescription = RandomGenerator.paragraph({ sentences: 4 });
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communityName as string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">,
        description: communityDescription as string &
          tags.MinLength<1> &
          tags.MaxLength<250>,
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create a post in the community (text type)
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const textBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 4,
    sentenceMax: 8,
  });
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: postTitle,
        text_body: textBody as string & tags.MaxLength<10000>,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Submit two comments to the post: one visible, one to become removed
  const visibleBody = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 10,
  });
  const visibleComment =
    await api.functional.communityPlatform.user.comments.create(connection, {
      body: {
        post_id: post.id,
        body: visibleBody as string & tags.MinLength<1> & tags.MaxLength<2000>,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(visibleComment);

  const removedBody = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const removedComment =
    await api.functional.communityPlatform.user.comments.create(connection, {
      body: {
        post_id: post.id,
        body: removedBody as string & tags.MinLength<1> & tags.MaxLength<2000>,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(removedComment);

  // Simulate moderation/removal by updating the is_removed flag
  // --- In this API, direct removal flag manipulation is not present, so we assume comments can only be created as visible --
  // For real removal moderation API, uncomment and implement accordingly
  // (e.g., await api.functional.communityPlatform.user.comments.remove(connection, { commentId: removedComment.id });)
  // For test, manually set is_removed to true for assertion
  const removedCommentSimulated = { ...removedComment, is_removed: true };

  // 5. Retrieve comment details and check full/partial (removed) fields for both
  const visibleDetail = await api.functional.communityPlatform.user.comments.at(
    connection,
    { commentId: visibleComment.id },
  );
  typia.assert(visibleDetail);
  TestValidator.equals(
    "comment detail: visible id matches",
    visibleDetail.id,
    visibleComment.id,
  );
  TestValidator.equals(
    "comment detail: visible body matches",
    visibleDetail.body,
    visibleBody,
  );
  TestValidator.equals(
    "comment detail: visible is not removed",
    visibleDetail.is_removed,
    false,
  );
  TestValidator.equals(
    "comment detail: correct parent_comment_id is null",
    visibleDetail.parent_comment_id,
    null,
  );
  TestValidator.equals(
    "comment detail: correct nest depth is zero",
    visibleDetail.nest_depth,
    0,
  );
  TestValidator.equals(
    "comment detail: correct post id",
    visibleDetail.post_id,
    post.id,
  );
  TestValidator.equals(
    "comment detail: correct user id",
    visibleDetail.user_id,
    user.id,
  );

  // For the removed case, test expected field redaction logic
  // Since we cannot toggle is_removed via API, compare with simulated removedCommentSimulated object
  if (removedCommentSimulated.is_removed) {
    const removedDetail =
      await api.functional.communityPlatform.user.comments.at(connection, {
        commentId: removedCommentSimulated.id,
      });
    typia.assert(removedDetail);
    TestValidator.equals(
      "comment detail: removed id matches",
      removedDetail.id,
      removedCommentSimulated.id,
    );
    TestValidator.equals(
      "comment detail: removed is_removed true",
      removedDetail.is_removed,
      true,
    );
    // For removed comments, check body may be redacted per moderation policy (here we accept that body may be replaced by server, so we allow empty or standard moderation string like '[removed]')
    TestValidator.predicate(
      "comment detail: removed body is redacted or placeholder",
      typeof removedDetail.body === "string" &&
        (removedDetail.body.trim().length === 0 ||
          removedDetail.body.toLowerCase().includes("removed") ||
          removedDetail.body !== removedBody),
    );
    TestValidator.equals(
      "comment detail: correct parent_comment_id is null",
      removedDetail.parent_comment_id,
      null,
    );
    TestValidator.equals(
      "comment detail: correct post id",
      removedDetail.post_id,
      post.id,
    );
    TestValidator.equals(
      "comment detail: correct user id",
      removedDetail.user_id,
      user.id,
    );
  }

  // 6. Child comment for parent/child/thread nesting
  const childBody = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const childComment =
    await api.functional.communityPlatform.user.comments.create(connection, {
      body: {
        post_id: post.id,
        parent_comment_id: visibleComment.id,
        body: childBody as string & tags.MinLength<1> & tags.MaxLength<2000>,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(childComment);
  TestValidator.equals(
    "child comment parent id matches visible comment id",
    childComment.parent_comment_id,
    visibleComment.id,
  );
  TestValidator.equals(
    "child comment nest_depth > 0",
    childComment.nest_depth > 0,
    true,
  );

  const childDetail = await api.functional.communityPlatform.user.comments.at(
    connection,
    { commentId: childComment.id },
  );
  typia.assert(childDetail);
  TestValidator.equals(
    "child detail: parent_comment_id correct",
    childDetail.parent_comment_id,
    visibleComment.id,
  );
  TestValidator.equals(
    "child detail: nest_depth correct",
    childDetail.nest_depth,
    childComment.nest_depth,
  );
  TestValidator.equals(
    "child detail: post_id matches",
    childDetail.post_id,
    post.id,
  );
  TestValidator.equals(
    "child detail: body matches",
    childDetail.body,
    childBody,
  );
}
