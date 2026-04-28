import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_moderators_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Test that unauthorized member cannot appoint a moderator to a community.
 *
 * Validates that the moderator appointment endpoint enforces hierarchical authority structure by rejecting attempts from regular members without moderation privileges. Only community creators (owners) and existing active moderators have the authority to appoint new moderators.
 *
 * 1. Authenticate member C (random member with no moderator privileges).
 * 2. Authenticate member A (community owner).
 * 3. Member A creates a community.
 * 4. Authenticate member D (target member to be appointed).
 * 5. Member C attempts to appoint member D as moderator of the community.
 * 6. Validate that the request is rejected due to authorization violation.
 */
export async function test_api_moderator_unauthorized_member_cannot_appoint(
  connection: api.IConnection,
) {
  // 1. Authenticate member C (random member with no moderator privileges)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(memberC);
  // 2. Authenticate member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(memberA);
  // 3. Member A creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Authenticate member D (target member to be appointed)
  const memberDConnection: api.IConnection = { host: connection.host };
  const memberD = await authorize_member_join(memberDConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(memberD);
  // 5. Member C attempts to appoint member D as moderator
  // This should fail because member C is not the community owner or active moderator
  await TestValidator.error(
    "unauthorized member cannot appoint moderator",
    async () => {
      await api.functional.redditLikeCommunity.member.moderators.create(
        memberCConnection,
        {
          body: {
            member_id: memberD.id,
            community_id: community.id,
          } satisfies IRedditLikeCommunityModerator.ICreate,
        },
      );
    },
  );
}
