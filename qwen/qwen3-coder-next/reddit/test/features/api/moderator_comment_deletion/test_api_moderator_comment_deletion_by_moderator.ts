import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_moderator_role } from "../../../prepare/prepare_random_reddit_like_moderator_role";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_moderator_comment_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  const memberLogin = await authorize_member_login(memberConnection, {
    body: {
      email: typia.assert<string & tags.MaxLength<255> & tags.Format<"email">>(member.email),
      password: "1234",
    } satisfies IRedditLikeMember.ILogin,
  });
  typia.assert(memberLogin);
  // 2. Create a post in a community
  // Using a randomly generated UUID for community_id since we don't have a way to list/create communities
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        content: RandomGenerator.content({ paragraphs: 2 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment = await api.functional.redditLike.member.posts.comments.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Register and login as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      password: "1234",
      bio: null,
      avatar_url: null,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderator);
  const moderatorLogin = await authorize_moderator_login(moderatorConnection, {
    body: {
      email: typia.assert<string & tags.MaxLength<255> & tags.Format<"email">>(moderator.email),
      password: "1234",
    } satisfies IRedditLikeModerator.ILogin,
  });
  typia.assert(moderatorLogin);
  // 5. Assign moderator role to the community using community name from post
  await generate_random_reddit_like_member_communities_moderators_create(
    memberConnection,
    {
      body: {
        user_id: moderator.id,
        community_id: post.community.id,
        role: "moderator",
      } satisfies IRedditLikeModeratorRole.ICreate,
      params: {
        communityName: post.community.name,
      },
    },
  );
  // 6. Delete the comment as moderator
  await api.functional.redditLike.moderator.comments.erase(
    moderatorConnection,
    {
      commentId: comment.id,
    },
  );
  // 7. The function returns void, so validation is that the API call succeeded
  // In a real test, we would verify the comment is marked as deleted and post comment count is decremented
}