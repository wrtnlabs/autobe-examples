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

export async function test_api_community_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
    },
  });
  typia.assert(memberAuth);
  // Step 2: Create community with both description and icon_url
  const initialDescription = "Initial description";
  const initialIconUrl = "https://example.com/icon1.png";
  const communityName = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: initialDescription,
          icon_url: initialIconUrl,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Verify initial state
  TestValidator.equals(
    "community has initial description",
    community.description,
    initialDescription,
  );
  TestValidator.equals(
    "community has initial icon",
    community.icon_url,
    initialIconUrl,
  );
  // Step 3: First partial update - only change description
  const updatedDescription = "Updated description";
  const updatedCommunity1: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.update(
      memberConnection,
      {
        communityId: community.id,
        body: {
          description: updatedDescription,
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity1);
  // Validate description changed, icon_url unchanged
  TestValidator.equals(
    "description updated",
    updatedCommunity1.description,
    updatedDescription,
  );
  TestValidator.equals(
    "icon_url unchanged after first update",
    updatedCommunity1.icon_url,
    initialIconUrl,
  );
  // Step 4: Second partial update - only change icon_url
  const updatedIconUrl = "https://example.com/icon2.png";
  const updatedCommunity2: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.update(
      memberConnection,
      {
        communityId: community.id,
        body: {
          icon_url: updatedIconUrl,
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity2);
  // Validate description unchanged, icon_url changed
  TestValidator.equals(
    "description unchanged after second update",
    updatedCommunity2.description,
    updatedDescription,
  );
  TestValidator.equals(
    "icon_url updated",
    updatedCommunity2.icon_url,
    updatedIconUrl,
  );
  // Step 5: Third update - change both fields
  const finalDescription = "Final description";
  const finalIconUrl = "https://example.com/icon3.png";
  const updatedCommunity3: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.update(
      memberConnection,
      {
        communityId: community.id,
        body: {
          description: finalDescription,
          icon_url: finalIconUrl,
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity3);
  // Validate both fields updated
  TestValidator.equals(
    "description fully updated",
    updatedCommunity3.description,
    finalDescription,
  );
  TestValidator.equals(
    "icon_url fully updated",
    updatedCommunity3.icon_url,
    finalIconUrl,
  );
  // Verify updated_at timestamp changed with each update
  TestValidator.notEquals(
    "updated_at changed after first update",
    community.updated_at,
    updatedCommunity1.updated_at,
  );
  TestValidator.notEquals(
    "updated_at changed after second update",
    updatedCommunity1.updated_at,
    updatedCommunity2.updated_at,
  );
  TestValidator.notEquals(
    "updated_at changed after third update",
    updatedCommunity2.updated_at,
    updatedCommunity3.updated_at,
  );
}
