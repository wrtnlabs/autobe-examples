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

export async function test_api_community_bans_filter_by_status_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner creates community
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      username: `owner_${RandomGenerator.alphabets(8)}`,
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 2. Member1 joins, subscribes, creates post, and gets banned (permanent ban)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      username: `member1_${RandomGenerator.alphabets(8)}`,
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(member1Auth);
  await generate_random_reddit_clone_member_subscriptions_create(
    member1Connection,
    { body: { communityId: community.id } },
  );
  await generate_random_reddit_clone_member_posts_create(member1Connection, {
    body: {
      communityId: community.id,
      title: RandomGenerator.paragraph({ sentences: 2 }),
      type: "text",
      body: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  const ban1 =
    await generate_random_reddit_clone_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityCode: community.name },
        body: {
          reason: "Violating community rules - spam",
          redditCloneUserId: member1Auth.id,
        },
      },
    );
  typia.assert(ban1);
  // 3. Member2 joins, subscribes, creates post, and gets banned with expired timestamp
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      username: `member2_${RandomGenerator.alphabets(8)}`,
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(member2Auth);
  await generate_random_reddit_clone_member_subscriptions_create(
    member2Connection,
    { body: { communityId: community.id } },
  );
  await generate_random_reddit_clone_member_posts_create(member2Connection, {
    body: {
      communityId: community.id,
      title: RandomGenerator.paragraph({ sentences: 2 }),
      type: "text",
      body: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  // Create expired ban (expires_at in the past)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);
  const ban2 =
    await generate_random_reddit_clone_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityCode: community.name },
        body: {
          reason: "Temporary violation",
          redditCloneUserId: member2Auth.id,
          expiresAt: pastDate.toISOString(),
        },
      },
    );
  typia.assert(ban2);
  // 4. Query all bans to get total count
  const allBans =
    await api.functional.redditClone.member.communities.bans.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {},
      },
    );
  typia.assert(allBans);
  // 5. Test status filter: 'active' (permanent bans only)
  const activeBans =
    await api.functional.redditClone.member.communities.bans.index(
      ownerConnection,
      {
        communityId: community.id,
        body: { status: "active", limit: 10 },
      },
    );
  typia.assert(activeBans);
  // Active filter should return ban1 (permanent ban)
  // Member2's ban is expired (expires_at <= NOW()), so it should NOT be in active
  const activeBanIds = activeBans.data.map((b) => b.id);
  TestValidator.equals(
    "active bans should include permanent ban",
    activeBanIds.includes(ban1.id),
    true,
  );
  TestValidator.equals(
    "active bans should NOT include expired ban",
    activeBanIds.indexOf(ban2.id) === -1,
    true,
  );
  // 6. Test status filter: 'expired'
  const expiredBans =
    await api.functional.redditClone.member.communities.bans.index(
      ownerConnection,
      {
        communityId: community.id,
        body: { status: "expired", limit: 10 },
      },
    );
  typia.assert(expiredBans);
  // Expired filter should return ban2 (has expires_at in the past)
  const expiredBanIds = expiredBans.data.map((b) => b.id);
  TestValidator.equals(
    "expired bans should include temporary expired ban",
    expiredBanIds.includes(ban2.id),
    true,
  );
  TestValidator.equals(
    "expired bans should NOT include permanent ban",
    expiredBanIds.indexOf(ban1.id) === -1,
    true,
  );
  // 7. Test status filter: 'revoked'
  // No revoked bans yet - filter should return empty or matching results
  const revokedBans =
    await api.functional.redditClone.member.communities.bans.index(
      ownerConnection,
      {
        communityId: community.id,
        body: { status: "revoked", limit: 10 },
      },
    );
  typia.assert(revokedBans);
  TestValidator.equals(
    "revoked bans should be empty initially",
    revokedBans.data.length,
    0,
  );
  // 8. Test pagination - page 1 with limit 1
  const page1Bans =
    await api.functional.redditClone.member.communities.bans.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          limit: 1,
          page: 1,
          sort: "created_at" as const,
          order: "desc" as const,
        },
      },
    );
  typia.assert(page1Bans);
  TestValidator.equals("page 1 should have 1 record", page1Bans.data.length, 1);
  TestValidator.equals(
    "page 1 should have correct page number",
    page1Bans.pagination.current,
    1,
  );
  // 9. Test pagination - page 2 with limit 1
  const page2Bans =
    await api.functional.redditClone.member.communities.bans.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          limit: 1,
          page: 2,
          sort: "created_at" as const,
          order: "desc" as const,
        },
      },
    );
  typia.assert(page2Bans);
  TestValidator.equals("page 2 should have 1 record", page2Bans.data.length, 1);
  TestValidator.equals(
    "page 2 should have correct page number",
    page2Bans.pagination.current,
    2,
  );
  // 10. Verify page 1 and page 2 have different records
  if (page1Bans.data.length > 0 && page2Bans.data.length > 0) {
    TestValidator.equals(
      "page 1 and page 2 should have different bans",
      page1Bans.data[0].id !== page2Bans.data[0].id,
      true,
    );
  }
  // 11. Verify total records match
  TestValidator.equals(
    "total records should match across pages",
    allBans.pagination.records,
    page1Bans.pagination.records,
  );
}