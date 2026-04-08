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

export async function test_api_community_non_owner_update_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(memberAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        username:
          RandomGenerator.alphaNumeric(8) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(memberA);
  // 2. Register and authenticate Member B (non-owner attempting unauthorized update)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(memberBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        username:
          RandomGenerator.alphaNumeric(8) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(memberB);
  // 3. Member A creates a community
  const originalName = `test_community_${RandomGenerator.alphaNumeric(6)}`;
  const originalDescription = "Original description from owner";
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberAConnection,
      {
        body: {
          name: originalName,
          description: originalDescription,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Verify community was created with correct owner
  TestValidator.equals(
    "community owner matches",
    community.owner.id,
    memberA.id,
  );
  TestValidator.equals(
    "initial description matches",
    community.description,
    originalDescription,
  );
  // 4. Member B attempts to update Member A's community (non-owner)
  await TestValidator.httpError(
    "non-owner should get 403 forbidden",
    403,
    async () => {
      await api.functional.redditPlatform.member.communities.update(
        memberBConnection,
        {
          name: community.name,
          body: {
            description: "Unauthorized update attempt",
          },
        },
      );
    },
  );
  // 5. Member A can still successfully update their own community after the failed attempt
  const newDescription = "Successfully updated by owner";
  const successfullyUpdatedCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.update(
      memberAConnection,
      {
        name: community.name,
        body: {
          description: newDescription,
        },
      },
    );
  typia.assert(successfullyUpdatedCommunity);
  TestValidator.equals(
    "owner can update community after non-owner failure attempt",
    successfullyUpdatedCommunity.description,
    newDescription,
  );
}
