import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

export async function test_api_post_vote_create_upvote_on_post(
  connection: api.IConnection,
) {
  // 1. Register a new member user (author + voter)
  const joinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community that allows posts and votes
  const slug = `community-${RandomGenerator.alphabets(8)}`;
  const communityBody = {
    slug,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community owner should be the joined member user",
    community.owner_memberuser_id,
    member.id,
  );

  // 3. Create a new post in the created community
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBodyText = RandomGenerator.content({ paragraphs: 1 });
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: postTitle,
    body: postBodyText,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community_id should match created community id",
    post.community_id,
    community.id,
  );
  TestValidator.equals(
    "post author_memberuser_id should match member user id",
    post.author_memberuser_id,
    member.id,
  );
  TestValidator.equals(
    "post title should match the requested title",
    post.title,
    postTitle,
  );

  // 4. Cast an upvote on the created post
  const voteBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const vote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: voteBody,
      },
    );
  typia.assert(vote);

  // 5. Validate vote entity content
  TestValidator.equals(
    "vote memberuser_id should equal acting member user's id",
    vote.memberuser_id,
    member.id,
  );
  TestValidator.equals(
    "vote post_id should equal target post id",
    vote.post_id,
    post.id,
  );
  TestValidator.equals("vote direction should be up", vote.direction, "up");

  // created_at and updated_at are already type-validated as date-time strings
  // by typia.assert, so we only minimally ensure they are non-empty strings.
  TestValidator.predicate(
    "vote created_at should be a non-empty string",
    typeof vote.created_at === "string" && vote.created_at.length > 0,
  );
  TestValidator.predicate(
    "vote updated_at should be a non-empty string",
    typeof vote.updated_at === "string" && vote.updated_at.length > 0,
  );
}
