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
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_moderator_add_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A (owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  const ownerId: string = ownerAuth.id;
  // 2. Authenticate as member B (future moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  const memberBId: string = memberBAuth.id;
  // 3. Create a new community as member A (owner)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Verify owner matches
  TestValidator.equals("community owner matches", community.owner.id, ownerId);
  // 4. Add member B as moderator using member A's (owner's) connection
  const moderatorAppointment =
    await generate_random_reddit_platform_member_communities_moderators_add(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          user_id: memberBId,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAppointment);
  // 5. Verify the moderator appointment response
  TestValidator.equals(
    "moderator appointment community_id",
    moderatorAppointment.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator appointment user_id",
    moderatorAppointment.user.id,
    memberBId,
  );
  // Verify timestamps exist
  TestValidator.equals(
    "moderator appointment created_at is string",
    typeof moderatorAppointment.created_at,
    "string",
  );
  TestValidator.equals(
    "moderator appointment updated_at is string",
    typeof moderatorAppointment.updated_at,
    "string",
  );
  // Verify member B has moderator privileges
  TestValidator.equals(
    "member B has 1 moderator community",
    memberBAuth.moderatorOfCommunities.length,
    1,
  );
  // Verify the appointed community is in member B's moderator list
  TestValidator.equals(
    "member B moderates this community",
    memberBAuth.moderatorOfCommunities.find((c) => c.id === community.id)?.name,
    community.name,
  );
  // Verify owner is not in the moderators list (owner != moderator)
  const ownerModeratedCommunity = ownerAuth.moderatorOfCommunities.find(
    (c) => c.id === community.id,
  );
  TestValidator.equals(
    "owner not in moderators list",
    ownerModeratedCommunity,
    undefined,
  );
}