import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_ban } from "../../../prepare/prepare_random_reddit_clone_ban";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that banned members cannot create comments in a community.
 *
 * This test validates the security boundary for banned users by:
 * 1. Creating two member accounts (one to be banned, one community owner)
 * 2. Community owner creates a community and a post
 * 3. Community owner bans the other member
 * 4. Banned member attempts to create a comment on the post
 * 5. Validates that the comment creation is rejected with appropriate error
 */
export async function test_api_comment_banned_user_restriction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create banned member account
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {
    body: undefined,
  });
  typia.assert(bannedMember);
  // 2. Setup: Create community owner account
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const communityOwner = await authorize_member_join(communityOwnerConnection, {
    body: undefined,
  });
  typia.assert(communityOwner);
  // 3. Setup: Community owner creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      communityOwnerConnection,
      { body: undefined },
    );
  typia.assert(community);
  // 4. Setup: Community owner creates a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    communityOwnerConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  typia.assert(post);
  // 5. Setup: Community owner bans the banned member from the community
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    communityOwnerConnection,
    {
      params: {
        communityId: community.id,
      },
      body: {
        member_id: bannedMember.id,
        reason: "Test ban for E2E validation",
      },
    },
  );
  typia.assert(ban);
  // 6. Test: Banned member attempts to create a comment on the post
  // This should fail because the member is banned from the community
  await TestValidator.error("banned member cannot create comment", async () => {
    await generate_random_reddit_clone_member_posts_comments_create(
      bannedMemberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: "This comment should not be created",
        },
      },
    );
  });
  // 7. Validation: Verify the ban is still active
  TestValidator.equals("ban is still active", ban.lifted_at, null);
}
