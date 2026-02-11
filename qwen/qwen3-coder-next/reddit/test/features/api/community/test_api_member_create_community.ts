import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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

export async function test_api_member_create_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member and capture member ID
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(2),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(registeredMember);
  const memberId = registeredMember.id;
  // 2. Create community with valid data
  const communityName = RandomGenerator.alphabets(8).toLowerCase();
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const iconUrl = `https://example.com/icons/${communityName}.png`;
  const createdCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: description,
          icon_url: iconUrl,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);
  // 3. Validate created community properties
  TestValidator.equals(
    "community name matches input",
    createdCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community description matches input",
    createdCommunity.description,
    description,
  );
  TestValidator.equals(
    "community icon URL matches input",
    createdCommunity.icon_url,
    iconUrl,
  );
  TestValidator.equals(
    "subscriber count initialized to 0",
    createdCommunity.subscriber_count,
    0,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    createdCommunity.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    createdCommunity.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", createdCommunity.deleted_at, null);
  // 4. Validate owner information
  TestValidator.equals(
    "owner ID matches member ID",
    createdCommunity.owner.id,
    memberId,
  );
  TestValidator.equals(
    "owner username matches member username",
    createdCommunity.owner.username,
    registeredMember.username,
  );
  // 5. Test community with minimal data (optional fields as null)
  const minimalCommunityName = RandomGenerator.alphabets(6).toLowerCase();
  const minimalCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: minimalCommunityName,
          description: null,
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(minimalCommunity);
  TestValidator.equals(
    "minimal community name correct",
    minimalCommunity.name,
    minimalCommunityName,
  );
  TestValidator.equals(
    "minimal community description is null",
    minimalCommunity.description,
    null,
  );
  TestValidator.equals(
    "minimal community icon is null",
    minimalCommunity.icon_url,
    null,
  );
  // 6. Verify community structure with typia
  typia.assert<IRedditPlatformCommunity>(minimalCommunity);
}
