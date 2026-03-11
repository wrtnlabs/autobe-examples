import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

export async function test_api_community_moderator_add_by_existing_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Create three members and a community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "12345678",
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(owner);
  const ownerId = owner.id;
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "12345678",
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  const memberAId = memberA.id;
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "12345678",
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  const memberBId = memberB.id;
  // 2. Owner creates community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.Pattern<"^[a-zA-Z0-9_]+$"> &
              tags.MinLength<3> &
              tags.MaxLength<21>
          >(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        },
      },
    );
  typia.assert(community);
  // 3. Owner adds member A as moderator (prerequisite setup)
  const initialModerator =
    await generate_random_reddit_platform_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          user_id: memberAId,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(initialModerator);
  // 4. Member A adds member B as moderator (target operation)
  const newModerator =
    await generate_random_reddit_platform_member_communities_moderators_create(
      memberAConnection,
      {
        body: {
          user_id: memberBId,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(newModerator);
  // 5. Validate moderator assignment
  TestValidator.equals(
    "community_id matches",
    newModerator.community_id,
    community.id,
  );
  TestValidator.equals(
    "user_id matches member B",
    newModerator.user_id,
    memberBId,
  );
  TestValidator.equals(
    "community relation matches",
    newModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "user relation matches member B",
    newModerator.user.id,
    memberBId,
  );
  TestValidator.predicate(
    "moderator created_at is valid",
    newModerator.created_at !== undefined,
  );
  TestValidator.predicate(
    "moderator updated_at is valid",
    newModerator.updated_at !== undefined,
  );
}