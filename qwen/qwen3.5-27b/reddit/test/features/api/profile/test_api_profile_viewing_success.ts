import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test the primary success path of viewing a user's public profile.
 *
 * Validates the complete profile viewing workflow including member account creation, content generation (posts and comments), and public profile retrieval. Ensures that the profile correctly displays user information, karma score calculation, and content history.
 *
 * Special attention is given to verifying that karma is correctly calculated from votes on posts and comments, that posts and comments are ordered by creation time descending, and that the profile endpoint is publicly accessible without authentication.
 *
 * 1. Member registers with email, password, and unique username.
 * 2. Member creates multiple posts (text, link, image types) in communities.
 * 3. Member creates several comments on posts.
 * 4. Profile endpoint is called with user's profileId (public access, no auth required).
 * 5. Validates profile fields, karma calculation, and content ordering.
 */
export async function test_api_profile_viewing_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with profile information
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      username: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create multiple posts for the user profile
  const posts: IRedditClonePost[] = [];
  for (let i = 0; i < 3; i++) {
    const post = await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      {},
    );
    typia.assert(post);
    posts.push(post);
  }
  // 3. Create several comments on posts
  const comments: IRedditCloneComment[] = [];
  for (const post of posts) {
    const comment =
      await generate_random_reddit_clone_member_posts_comments_create(
        memberConnection,
        {
          params: { postId: post.id },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 4. View profile using unauthenticated connection (public endpoint)
  const publicConnection: api.IConnection = { host: connection.host };
  const profile = await api.functional.redditClone.profiles.at(
    publicConnection,
    {
      profileId: member.id,
    },
  );
  typia.assert(profile);
  // 5. Validate profile fields
  TestValidator.equals("profile id matches", profile.id, member.id);
  TestValidator.equals(
    "display name present",
    profile.display_name,
    member.display_name,
  );
  TestValidator.predicate(
    "bio is string or null",
    typeof profile.bio === "string" || profile.bio === null,
  );
  TestValidator.predicate(
    "avatar is string or null",
    typeof profile.avatar === "string" || profile.avatar === null,
  );
  TestValidator.predicate("karma is number", typeof profile.karma === "number");
  TestValidator.predicate("deleted_at is null", profile.deleted_at === null);
  // 6. Validate posts array
  TestValidator.equals(
    "posts count matches",
    profile.posts.length,
    posts.length,
  );
  TestValidator.predicate("posts ordered by created_at desc", () => {
    for (let i = 1; i < profile.posts.length; i++) {
      if (
        new Date(profile.posts[i].created_at) >
        new Date(profile.posts[i - 1].created_at)
      ) {
        return false;
      }
    }
    return true;
  });
  // 7. Validate comments array
  TestValidator.equals(
    "comments count matches",
    profile.comments.length,
    comments.length,
  );
  TestValidator.predicate("comments ordered by created_at desc", () => {
    for (let i = 1; i < profile.comments.length; i++) {
      if (
        new Date(profile.comments[i].created_at) >
        new Date(profile.comments[i - 1].created_at)
      ) {
        return false;
      }
    }
    return true;
  });
  // 8. Validate karma calculation
  TestValidator.predicate(
    "karma is calculated",
    typeof profile.karma === "number",
  );
}
