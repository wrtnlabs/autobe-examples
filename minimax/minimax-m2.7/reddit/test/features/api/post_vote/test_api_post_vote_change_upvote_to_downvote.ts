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

export async function test_api_post_vote_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member1 who will create the post and cast votes
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create a community where the post will be submitted
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create a text post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 4. Cast an initial upvote on the post using POST /member/posts/{postId}/votes
  const initialVote =
    await api.functional.redditClone.member.posts.votes.create(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(initialVote);
  // Validate initial vote direction
  TestValidator.equals(
    "initial vote direction should be upvote",
    initialVote.direction,
    "upvote",
  );
  TestValidator.equals(
    "vote should belong to the member",
    initialVote.member.id,
    authorized.id,
  );
  // 5. Change the vote from upvote to downvote using PUT /member/posts/{postId}/votes/{voteId}
  const updatedVote =
    await api.functional.redditClone.member.posts.votes.update(
      memberConnection,
      {
        postId: post.id,
        voteId: initialVote.id,
        body: {
          direction: "downvote",
        } satisfies IRedditClonePostImage.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // 6. Verify the response returns updated vote with direction='downvote'
  TestValidator.equals(
    "updated vote direction should be downvote",
    updatedVote.direction,
    "downvote",
  );
  TestValidator.equals(
    "vote id should remain the same",
    updatedVote.id,
    initialVote.id,
  );
  TestValidator.equals(
    "vote should still belong to the same member",
    updatedVote.member.id,
    authorized.id,
  );
  // Verify updated_at timestamp was updated (should differ from created_at if changed)
  TestValidator.predicate("updated_at should exist", !!updatedVote.updated_at);
  // The vote record should have the same created_at but updated updated_at
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedVote.created_at,
    initialVote.created_at,
  );
}
