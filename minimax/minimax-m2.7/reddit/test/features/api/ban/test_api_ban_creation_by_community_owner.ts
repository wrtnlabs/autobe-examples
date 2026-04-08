import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
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
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_ban_creation_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member1 (community owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: `owner_${RandomGenerator.alphaNumeric(8)}`,
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(member1);
  // 2. Create a community (member1 becomes owner)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          description: "A test community for ban testing",
        },
      },
    );
  typia.assert(community);
  // 3. Authenticate as member2 (target of the ban)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: `banned_${RandomGenerator.alphaNumeric(8)}`,
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(member2);
  // 4. Subscribe member2 to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      member2Connection,
      {
        body: {
          communityId: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 5. Owner (member1) bans member2 from the community
  const banReason = "Violation of community rules";
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    member1Connection,
    {
      params: {
        communityCode: community.name,
      },
      body: {
        reason: banReason,
        redditCloneUserId: member2.id,
      },
    },
  );
  typia.assert(ban);
  // Validate the ban response
  TestValidator.equals("ban has valid id", ban.id !== null, true);
  TestValidator.equals("ban reason matches", ban.reason, banReason);
  TestValidator.equals("community matches", ban.community.id, community.id);
  TestValidator.equals("banned user matches", ban.bannedUser.id, member2.id);
  TestValidator.equals("issuer matches owner", ban.issuer.id, member1.id);
  TestValidator.equals(
    "expiresAt is null for permanent ban",
    ban.expiresAt,
    null,
  );
  TestValidator.equals("deletedAt is null for active ban", ban.deletedAt, null);
}
