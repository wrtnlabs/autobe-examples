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

export async function test_api_community_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community with initial data
  const initialDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const initialIconUrl = typia.random<string & tags.Format<"uri">>();
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<20> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          description: initialDescription,
          icon_url: initialIconUrl,
        },
      },
    );
  typia.assert(community);
  // 3. Store original timestamps and values for comparison
  const originalCreatedAt = community.created_at;
  const originalUpdatedAt = community.updated_at;
  const originalSubscriberCount = community.subscriber_count;
  const originalDeletedAt = community.deleted_at;
  // 4. Update community with new description and icon_url
  const newDescription = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const newIconUrl = typia.random<string & tags.Format<"uri">>();
  const updated = await api.functional.redditPlatform.member.communities.update(
    memberConnection,
    {
      communityId: community.id,
      body: {
        description: newDescription,
        icon_url: newIconUrl,
      } satisfies IRedditPlatformCommunity.IUpdate,
    },
  );
  typia.assert(updated);
  // 5. Validate response fields
  // Verify description was updated
  TestValidator.equals(
    "description updated",
    updated.description,
    newDescription,
  );
  // Verify icon_url was updated
  TestValidator.equals("icon_url updated", updated.icon_url, newIconUrl);
  // Verify updated_at timestamp changed and is current
  TestValidator.notEquals(
    "updated_at changed",
    originalUpdatedAt,
    updated.updated_at,
  );
  const now = new Date();
  const updatedDate = new Date(updated.updated_at);
  const timeDiff = Math.abs(now.getTime() - updatedDate.getTime());
  TestValidator.predicate(
    "updated_at within last minute",
    () => timeDiff < 60 * 1000,
  );
  // Verify created_at unchanged
  TestValidator.equals(
    "created_at unchanged",
    originalCreatedAt,
    updated.created_at,
  );
  // Verify subscriber_count unchanged
  TestValidator.equals(
    "subscriber_count unchanged",
    originalSubscriberCount,
    updated.subscriber_count,
  );
  // Verify deleted_at unchanged (should still be null)
  TestValidator.equals(
    "deleted_at unchanged",
    originalDeletedAt,
    updated.deleted_at,
  );
  // Verify owner matches authenticated member
  TestValidator.equals("owner matches", updated.owner.id, member.id);
  // Verify all required fields present in response
  TestValidator.predicate("response has all required fields", () => {
    return (
      updated.id !== undefined &&
      updated.name !== undefined &&
      updated.description !== undefined &&
      updated.icon_url !== undefined &&
      updated.subscriber_count !== undefined &&
      updated.owner !== undefined &&
      updated.subscriptions !== undefined &&
      updated.moderators !== undefined &&
      updated.bans !== undefined &&
      updated.created_at !== undefined &&
      updated.updated_at !== undefined &&
      updated.deleted_at !== undefined
    );
  });
}
