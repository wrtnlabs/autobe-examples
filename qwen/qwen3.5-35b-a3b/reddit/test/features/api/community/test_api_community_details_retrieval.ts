import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful community retrieval with authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  // Create a community
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: typia.random<string>(),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Retrieve community details
  const retrievedCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.communities.at(memberConnection, {
      communityId: community.id,
    });
  typia.assert(retrievedCommunity);
  // Validate community retrieval
  TestValidator.equals(
    "community id matches",
    retrievedCommunity.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    retrievedCommunity.description,
    community.description,
  );
  TestValidator.equals(
    "community icon_url matches",
    retrievedCommunity.icon_url,
    community.icon_url,
  );
  TestValidator.equals(
    "subscriber count is 0",
    retrievedCommunity.subscriber_count,
    0,
  );
  TestValidator.equals(
    "owner id matches",
    retrievedCommunity.owner.id,
    member.id,
  );
  TestValidator.equals(
    "owner username matches",
    retrievedCommunity.owner.username,
    member.username,
  );
  TestValidator.equals(
    "owner displayName matches",
    retrievedCommunity.owner.displayName,
    member.displayName,
  );
  TestValidator.equals(
    "subscriptions array length",
    retrievedCommunity.subscriptions.length,
    0,
  );
  TestValidator.equals(
    "moderators array length",
    retrievedCommunity.moderators.length,
    0,
  );
  TestValidator.equals("bans array length", retrievedCommunity.bans.length, 0);
  TestValidator.equals(
    "deleted_at is null",
    retrievedCommunity.deleted_at,
    null,
  );
  // Scenario 2: Public access verification without authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const publicCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.communities.at(guestConnection, {
      communityId: community.id,
    });
  typia.assert(publicCommunity);
  // Verify public access returns same data
  TestValidator.equals("public id matches", publicCommunity.id, community.id);
  TestValidator.equals(
    "public name matches",
    publicCommunity.name,
    community.name,
  );
  TestValidator.equals(
    "public description matches",
    publicCommunity.description,
    community.description,
  );
  TestValidator.equals(
    "public owner matches",
    publicCommunity.owner.id,
    member.id,
  );
}
