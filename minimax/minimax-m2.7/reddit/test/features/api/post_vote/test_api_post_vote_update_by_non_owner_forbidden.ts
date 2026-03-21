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

export async function test_api_post_vote_update_by_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member1 and create a community and text post
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text",
      },
    },
  );
  // 2. Authenticate as member2
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // 3. member1 casts an upvote on the post
  const vote = await api.functional.redditClone.member.posts.votes.create(
    member1Connection,
    {
      postId: post.id,
    },
  );
  typia.assert(vote);
  TestValidator.equals("vote direction is upvote", vote.direction, "upvote");
  // 4. member2 attempts to update member1's vote (should fail with 403)
  await TestValidator.error("non-owner cannot update vote", async () => {
    await api.functional.redditClone.member.posts.votes.update(
      member2Connection,
      {
        postId: post.id,
        voteId: vote.id,
        body: {
          direction: "downvote",
        } satisfies IRedditClonePostImage.IUpdate,
      },
    );
  });
}
