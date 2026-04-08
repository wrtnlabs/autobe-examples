import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
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
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_community_bans_filter_by_username(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: "owner_" + RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create community as owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create member to be banned with username containing "testuser"
  const bannedConnection: api.IConnection = { host: connection.host };
  const bannedAuth = await authorize_member_join(bannedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: "testuser_" + RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(bannedAuth);
  // 4. Subscribe banned member to community
  await generate_random_reddit_clone_member_subscriptions_create(
    bannedConnection,
    {
      body: { communityId: community.id },
    },
  );
  // 5. Create a post so member can be banned
  await generate_random_reddit_clone_member_posts_create(bannedConnection, {
    body: {
      communityId: community.id,
      title: "Test post for ban test",
      type: "text",
      body: "This post will get me banned",
    },
  });
  // 6. Owner bans the member
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      body: {
        redditCloneUserId: bannedAuth.id,
        reason: "Testing username filter functionality",
      },
      params: { communityCode: community.name },
    },
  );
  typia.assert(ban);
  // 7. Test: Filter by partial username "test" (case-insensitive)
  const partialMatchResult =
    await api.functional.redditClone.member.communities.bans.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          bannedUsername: "test",
        },
      },
    );
  typia.assert(partialMatchResult);
  TestValidator.equals(
    "should find banned user with 'test' prefix",
    partialMatchResult.data.length > 0,
    true,
  );
  TestValidator.equals(
    "banned username contains 'test'",
    partialMatchResult.data[0].bannedUser.username.includes("testuser"),
    true,
  );
  // 8. Test: Filter by non-matching username
  const noMatchResult =
    await api.functional.redditClone.member.communities.bans.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          bannedUsername: "xyz_nonexistent",
        },
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "should return empty for non-matching username",
    noMatchResult.data.length,
    0,
  );
  // 9. Test: Combine username filter with active status
  const combinedActiveResult =
    await api.functional.redditClone.member.communities.bans.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          bannedUsername: "test",
          status: "active",
        },
      },
    );
  typia.assert(combinedActiveResult);
  TestValidator.equals(
    "should find active bans with 'test' username",
    combinedActiveResult.data.length > 0,
    true,
  );
  TestValidator.equals(
    "ban is active",
    combinedActiveResult.data[0].isActive,
    true,
  );
  // 10. Test: Combine username filter with revoked status (should be empty since ban is active)
  const combinedRevokedResult =
    await api.functional.redditClone.member.communities.bans.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          bannedUsername: "test",
          status: "revoked",
        },
      },
    );
  typia.assert(combinedRevokedResult);
  TestValidator.equals(
    "should return empty for revoked status filter on active ban",
    combinedRevokedResult.data.length,
    0,
  );
}
