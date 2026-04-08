import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

/**
 * Test authorization enforcement where a non-owner moderator attempts to remove another moderator.
 *
 * Validates that only the community owner has authority to remove moderators from the community. Regular moderators cannot remove other moderators, preventing them from undermining the moderation team structure.
 *
 * The test establishes a community with an owner and two moderators (Member A and Member B), then verifies that Member B's attempt to remove Member A is rejected with an authorization error.
 *
 * 1. Community owner authenticates via member join and creates a new community.
 * 2. Owner adds Member A as a moderator to the community.
 * 3. Owner adds Member B as a moderator to the community.
 * 4. Member B authenticates via separate member join to obtain their own connection.
 * 5. Member B attempts to remove Member A from the moderator team.
 * 6. Validates the system rejects the request with authorization error (403 Forbidden).
 */
export async function test_api_moderator_removal_non_owner_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner authenticates and creates community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(owner);
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 2. Create Member A and add as moderator
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberA);
  const moderatorA =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          memberId: memberA.id,
          role: "moderator",
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorA);
  TestValidator.equals(
    "moderator A member ID",
    moderatorA.member.id,
    memberA.id,
  );
  // 3. Create Member B and add as moderator
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberB);
  const moderatorB =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          memberId: memberB.id,
          role: "moderator",
        } satisfies IRedditCommunityModerator.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorB);
  TestValidator.equals(
    "moderator B member ID",
    moderatorB.member.id,
    memberB.id,
  );
  // 4. Member B attempts to remove Member A (should fail with authorization error)
  await TestValidator.error(
    "non-owner moderator cannot remove other moderators",
    async () => {
      await api.functional.redditCommunity.member.communities.moderators.erase(
        memberBConnection,
        {
          communityId: community.id,
          moderatorId: memberA.id,
        },
      );
    },
  );
}
