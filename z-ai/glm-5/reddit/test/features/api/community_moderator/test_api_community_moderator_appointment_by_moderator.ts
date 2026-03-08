import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_add_moderator } from "../../../generate/generate_random_community_platform_member_communities_moderators_add_moderator";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_moderator_appointment_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create three member connections: owner, first moderator, second moderator
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  const firstModConnection: api.IConnection = { host: connection.host };
  const firstModAuth = await authorize_member_join(firstModConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(firstModAuth);
  const secondModConnection: api.IConnection = { host: connection.host };
  const secondModAuth = await authorize_member_join(secondModConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(secondModAuth);
  // 2. Owner creates a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Owner appoints the first moderator
  const firstModerator =
    await api.functional.communityPlatform.member.communities.moderators.addModerator(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          username: firstModAuth.username,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(firstModerator);
  // Validate first moderator was appointed correctly
  TestValidator.equals(
    "first moderator community matches",
    firstModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "first moderator member matches",
    firstModerator.member.id,
    firstModAuth.id,
  );
  // 4. First moderator (now with privileges) appoints the second moderator
  // This validates that moderators (not just owners) can appoint other moderators
  const secondModerator =
    await api.functional.communityPlatform.member.communities.moderators.addModerator(
      firstModConnection,
      {
        communityName: community.name,
        body: {
          username: secondModAuth.username,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(secondModerator);
  // Validate second moderator was appointed correctly
  TestValidator.equals(
    "second moderator community matches",
    secondModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "second moderator member matches",
    secondModerator.member.id,
    secondModAuth.id,
  );
}
