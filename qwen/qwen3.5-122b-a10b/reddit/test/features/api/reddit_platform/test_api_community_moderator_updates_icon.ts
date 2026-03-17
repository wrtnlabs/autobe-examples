import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
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
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

/**
 * Test that a community moderator (not owner) can successfully update the community's icon image.
 *
 * This test validates:
 * 1. Moderator authorization for community updates
 * 2. Icon update functionality
 * 3. Timestamp update verification
 */
export async function test_api_community_moderator_updates_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoinInput: IRedditPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    username: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const owner = await authorize_member_join(ownerConnection, {
    body: ownerJoinInput,
  });
  typia.assert(owner);
  // 2. Create and authenticate moderator member
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinInput: IRedditPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    username: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: moderatorJoinInput,
  });
  typia.assert(moderator);
  // 3. Create community with owner as the creator
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Assign second member as moderator
  const moderatorAssignment =
    await api.functional.redditPlatform.member.communities.moderators.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          member_id: moderator.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Generate a random file UUID to represent a new icon
  const newIconId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 6. Store original updated_at timestamp
  const originalUpdatedAt: string & tags.Format<"date-time"> =
    community.updatedAt;
  // 7. Update community icon as moderator
  const updatedCommunity =
    await api.functional.redditPlatform.member.communities.update(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          icon_id: newIconId,
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // 8. Verify the response contains the updated community with the new icon
  TestValidator.equals(
    "community ID matches",
    updatedCommunity.id,
    community.id,
  );
  TestValidator.equals(
    "icon_id updated to new value",
    updatedCommunity.icon?.id,
    newIconId,
  );
  // 9. Verify the updated_at timestamp has changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedCommunity.updatedAt,
    originalUpdatedAt,
  );
}