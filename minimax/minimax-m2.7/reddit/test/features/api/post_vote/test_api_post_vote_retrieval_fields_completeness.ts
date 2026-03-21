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

export async function test_api_post_vote_retrieval_fields_completeness(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community and post
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityName: community.name,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 3. Cast upvote
  const vote = await api.functional.redditClone.member.posts.votes.create(
    memberConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(vote);
  // 4. Retrieve vote details
  const retrievedVote = await api.functional.redditClone.posts.votes.at(
    memberConnection,
    {
      postId: post.id,
      voteId: vote.id,
    },
  );
  typia.assert(retrievedVote);
  // 5. Validate all schema fields are present in response
  // Validate vote record fields
  TestValidator.equals("vote id is present", retrievedVote.id, vote.id);
  TestValidator.equals(
    "vote direction is upvote",
    retrievedVote.direction,
    "upvote",
  );
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedVote.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedVote.updated_at),
  );
  // Validate member summary fields
  TestValidator.equals("member id is present", !!retrievedVote.member.id, true);
  TestValidator.equals(
    "member username is present",
    !!retrievedVote.member.username,
    true,
  );
  TestValidator.equals(
    "member created_at is present",
    !!retrievedVote.member.created_at,
    true,
  );
  TestValidator.equals(
    "member karma_count is present",
    typeof retrievedVote.member.karma_count === "number",
    true,
  );
  // Validate member profile summary
  TestValidator.equals(
    "member profile is present",
    !!retrievedVote.member.profile,
    true,
  );
  TestValidator.equals(
    "member profile id is present",
    !!retrievedVote.member.profile.id,
    true,
  );
  TestValidator.equals(
    "member profile display_name is present",
    !!retrievedVote.member.profile.display_name,
    true,
  );
}
