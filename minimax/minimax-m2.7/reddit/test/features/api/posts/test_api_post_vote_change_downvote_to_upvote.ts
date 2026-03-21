import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";

export async function test_api_post_vote_change_downvote_to_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create post in community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityName: community.name,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text" as const,
      },
    },
  );
  typia.assert(post);
  // 4. Cast initial upvote
  const initialVote =
    await api.functional.redditClone.member.posts.votes.create(
      memberConnection,
      { postId: post.id },
    );
  typia.assert(initialVote);
  // 5. Change upvote to downvote first (to create downvote state)
  // This allows us to test the "downvote to upvote" scenario
  const downvoteVote = await api.functional.redditClone.posts.votes.change(
    memberConnection,
    {
      postId: post.id,
      body: {
        direction: "downvote" as const,
      },
    },
  );
  typia.assert(downvoteVote);
  TestValidator.equals(
    "direction is downvote",
    downvoteVote.direction,
    "downvote",
  );
  // 6. Change downvote to upvote (the main test case)
  const changedVote = await api.functional.redditClone.posts.votes.change(
    memberConnection,
    {
      postId: post.id,
      body: {
        direction: "upvote" as const,
      },
    },
  );
  typia.assert(changedVote);
  // 7. Validate vote direction changed to upvote
  TestValidator.equals(
    "vote direction is upvote",
    changedVote.direction,
    "upvote",
  );
  // 8. Validate vote belongs to the member
  TestValidator.equals(
    "vote member id matches",
    changedVote.member.id,
    member.id,
  );
  // 9. Validate vote record has updated timestamp
  TestValidator.predicate(
    "updated_at exists and is valid",
    changedVote.updated_at !== undefined && changedVote.updated_at.length > 0,
  );
}
