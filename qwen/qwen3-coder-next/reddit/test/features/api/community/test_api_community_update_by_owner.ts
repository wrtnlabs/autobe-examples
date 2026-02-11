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

export async function test_api_community_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const newMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(newMember);
  // Create new connection with token from registration
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: newMember.token.access,
    },
  };
  // Step 2: Create a community as that member
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberAuthConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: "Original description",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Update the community's description with new information
  const updatedCommunity =
    await api.functional.redditPlatform.member.communities.update(
      memberAuthConnection,
      {
        communityId: community.id,
        body: {
          description: "Updated description for testing",
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // Validate: Community details updated successfully with new description
  TestValidator.equals(
    "community description updated",
    updatedCommunity.description,
    "Updated description for testing",
  );
  TestValidator.equals(
    "community name unchanged",
    updatedCommunity.name,
    community.name.toLowerCase(),
  );
  TestValidator.equals(
    "community owner is the member",
    updatedCommunity.owner.id,
    newMember.id,
  );
}
