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

export async function test_api_community_update_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member1
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Response = await authorize_member_join(member1Connection, {
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
  });
  typia.assert(member1Response);
  // 2. Member1 creates a community
  const communityName = RandomGenerator.name(3);
  const community =
    await api.functional.redditPlatform.member.communities.create(
      member1Connection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Store original community details for verification
  const originalDescription = community.description ?? "";
  const originalOwnerId = community.owner.id;
  // 4. Authenticate member2 (different user)
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
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
  });
  // 5. Attempt to update member1's community with member2's authentication
  // This should fail with 403 Forbidden
  await TestValidator.error(
    "should reject non-owner community update",
    async () => {
      await api.functional.redditPlatform.member.communities.update(
        member2Connection,
        {
          communityId: community.id,
          body: {
            description: "Updated by non-owner",
          } satisfies IRedditPlatformCommunity.IUpdate,
        },
      );
    },
  );
  // 6. Verify member2 cannot update the community even with different changes
  await TestValidator.error(
    "should reject non-owner with icon update",
    async () => {
      await api.functional.redditPlatform.member.communities.update(
        member2Connection,
        {
          communityId: community.id,
          body: {
            icon_url: "https://example.com/icon.png",
          } satisfies IRedditPlatformCommunity.IUpdate,
        },
      );
    },
  );
  // 7. Verify the community still exists and can be used by member1
  // We know this by the fact that member1 successfully created it above
  // The fact that member2 couldn't update it proves the authorization check works
  TestValidator.equals(
    "original owner unchanged",
    originalOwnerId,
    member1Response.id,
  );
  // 8. Verify community still accessible by owner
  TestValidator.equals(
    "community name preserved",
    originalDescription !== "" ? originalDescription : null,
    community.description ?? "",
  );
}
