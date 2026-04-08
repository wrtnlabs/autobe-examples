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

export async function test_api_community_bans_list_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a community where the authenticated member becomes owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Authenticate as member to be banned
  const bannedConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedConnection, {});
  typia.assert(bannedMember);
  // 4. Subscribe the second member to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    bannedConnection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditCloneSubscription.ICreate,
    },
  );
  // 5. Create a post so the member can be banned
  await generate_random_reddit_clone_member_posts_create(bannedConnection, {
    body: {
      communityId: community.id,
      title: RandomGenerator.paragraph({ sentences: 1 }),
      type: "text",
      body: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditClonePost.ICreate,
  });
  // 6. Ban the member from the community as the owner
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      body: {
        reason: "Violated community rules",
        redditCloneUserId: bannedMember.id,
      } satisfies IRedditCloneCommunityBan.ICreate,
      params: {
        communityCode: community.name,
      },
    },
  );
  typia.assert(ban);
  // 7. List banned users with default filters (active bans only)
  const response =
    await api.functional.redditClone.member.communities.bans.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          status: "active",
        } satisfies IRedditCloneCommunityBan.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata exists
  TestValidator.equals(
    "has pagination metadata",
    response.pagination !== null && response.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "pagination current >= 0",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // Validate data array contains ban summaries
  TestValidator.predicate("has data array", response.data.length > 0);
  const banSummary = response.data[0];
  // Validate ban summary structure
  TestValidator.equals("has id", banSummary.id !== undefined, true);
  TestValidator.equals("has reason", banSummary.reason !== undefined, true);
  TestValidator.equals(
    "has createdAt",
    banSummary.createdAt !== undefined,
    true,
  );
  TestValidator.equals(
    "has updatedAt",
    banSummary.updatedAt !== undefined,
    true,
  );
  TestValidator.equals(
    "has deletedAt",
    banSummary.deletedAt !== undefined,
    true,
  );
  TestValidator.equals(
    "has expiresAt",
    banSummary.expiresAt !== undefined,
    true,
  );
  TestValidator.equals("has isActive", banSummary.isActive !== undefined, true);
  // Validate banned user info
  TestValidator.equals(
    "has bannedUser",
    banSummary.bannedUser !== undefined,
    true,
  );
  TestValidator.equals(
    "bannedUser has id",
    banSummary.bannedUser.id !== undefined,
    true,
  );
  TestValidator.equals(
    "bannedUser has username",
    banSummary.bannedUser.username !== undefined,
    true,
  );
  // Validate issuer info
  TestValidator.equals("has issuer", banSummary.issuer !== undefined, true);
  TestValidator.equals(
    "issuer has id",
    banSummary.issuer.id !== undefined,
    true,
  );
  TestValidator.equals(
    "issuer has username",
    banSummary.issuer.username !== undefined,
    true,
  );
  // Validate default filter shows active bans only
  TestValidator.predicate(
    "all bans are active",
    response.data.every((b) => b.isActive === true),
  );
}
