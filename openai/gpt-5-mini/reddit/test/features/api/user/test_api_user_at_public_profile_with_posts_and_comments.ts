import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

export async function test_api_user_at_public_profile_with_posts_and_comments(
  connection: api.IConnection,
) {
  // 1) Register author user
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorUsername = RandomGenerator.alphaNumeric(8);
  const authorDisplay = RandomGenerator.name();
  const authorPassword = "P@ssw0rd!";

  const author: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: authorUsername,
        email: authorEmail,
        password: authorPassword,
        display_name: authorDisplay,
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(author);

  // 2) As author, create a community
  const communityName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const communitySlug = `test-${RandomGenerator.alphaNumeric(6)}`.toLowerCase();
  const communityBody = {
    name: communityName,
    slug: communitySlug,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3) As author, create a text post in the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const createPostBody = {
    community_id: community.id,
    post_type: "text",
    title: postTitle,
    body: postBody,
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: createPostBody,
    });
  typia.assert(post);

  // 4) Register a commenter (this will change connection auth to commenter)
  const commenterEmail = typia.random<string & tags.Format<"email">>();
  const commenterUsername = RandomGenerator.alphaNumeric(8);
  const commenterDisplay = RandomGenerator.name();
  const commenterPassword = "P@ssw0rd!";

  const commenter: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: commenterUsername,
        email: commenterEmail,
        password: commenterPassword,
        display_name: commenterDisplay,
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(commenter);

  // 5) As commenter, create a comment on the author's post
  const commentBody = {
    post_id: post.id,
    parent_comment_id: null,
    body: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPortalComment.ICreate;

  const comment: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 6) Retrieve the author's public profile and validate
  const profile: ICommunityPortalUser =
    await api.functional.communityPortal.users.at(connection, {
      userId: author.id,
    });
  typia.assert(profile);

  // Business-level assertions
  TestValidator.equals("profile id matches author", profile.id, author.id);
  TestValidator.equals(
    "profile username matches author",
    profile.username,
    author.username,
  );

  // Ensure no sensitive properties are exposed (email, password_hash)
  TestValidator.predicate(
    "profile exposes no sensitive fields",
    !("email" in profile) && !("password_hash" in profile),
  );

  // If the registration response included karma, assert consistency
  if (author.karma !== undefined && author.karma !== null) {
    TestValidator.equals(
      "karma matches registration",
      profile.karma,
      author.karma,
    );
  }
}
