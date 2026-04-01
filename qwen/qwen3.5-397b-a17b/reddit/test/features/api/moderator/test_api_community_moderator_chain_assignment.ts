import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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

export async function test_api_community_moderator_chain_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register three member accounts: owner, first moderator, second moderator
  const ownerAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  const firstModAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(firstModAuth);
  const secondModAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(secondModAuth);
  // 2. Owner creates a community
  const ownerConnection: api.IConnection = { host: connection.host };
  ownerConnection.headers = { Authorization: ownerAuth.token.access };
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Owner adds first moderator to the community
  const firstModRecord =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: {
          member_id: firstModAuth.id,
        } satisfies IRedditCommunityModerator.ICreate,
      },
    );
  typia.assert(firstModRecord);
  // Verify first moderator was added by owner
  TestValidator.equals(
    "first moderator added by owner",
    firstModRecord.addedBy.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "first moderator member matches",
    firstModRecord.member.id,
    firstModAuth.id,
  );
  TestValidator.predicate(
    "first moderator is active",
    firstModRecord.deleted_at === null,
  );
  // 4. First moderator authenticates and adds second moderator
  const firstModConnection: api.IConnection = { host: connection.host };
  firstModConnection.headers = { Authorization: firstModAuth.token.access };
  const secondModRecord =
    await generate_random_reddit_community_member_communities_moderators_create(
      firstModConnection,
      {
        params: { communityName: community.name },
        body: {
          member_id: secondModAuth.id,
        } satisfies IRedditCommunityModerator.ICreate,
      },
    );
  typia.assert(secondModRecord);
  // 5. Verify the moderator chain - second moderator should be added by first moderator, not owner
  TestValidator.equals(
    "second moderator added by first moderator",
    secondModRecord.addedBy.id,
    firstModAuth.id,
  );
  TestValidator.notEquals(
    "second moderator not added by owner",
    secondModRecord.addedBy.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "second moderator member matches",
    secondModRecord.member.id,
    secondModAuth.id,
  );
  TestValidator.predicate(
    "second moderator is active",
    secondModRecord.deleted_at === null,
  );
  // 6. Verify community reference is correct for both moderators
  TestValidator.equals(
    "first mod community matches",
    firstModRecord.community.id,
    community.id,
  );
  TestValidator.equals(
    "second mod community matches",
    secondModRecord.community.id,
    community.id,
  );
  // 7. Verify addedBy IDs match the chain (IRedditCommunityUserProfile.ISummary has username)
  TestValidator.equals(
    "first mod addedBy ID",
    firstModRecord.addedBy.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "second mod addedBy ID",
    secondModRecord.addedBy.id,
    firstModAuth.id,
  );
}
