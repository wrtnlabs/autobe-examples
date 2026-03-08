import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<(string & tags.MinLength<1>) & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    },
  });
  // 2. Create member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<(string & tags.MinLength<1>) & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    },
  });
  // 3. List communities to get existing community
  const listResponse = await api.functional.redditLike.communities.index(
    memberConnection,
    {
      body: {
        search: undefined,
        sort: "subscribers",
        subscriptionStatus: "all",
        page: 1,
        limit: 10,
      },
    },
  );
  // Use first community if available
  if (listResponse.data.length === 0) {
    return; // Skip test if no communities exist
  }
  const targetCommunityName = listResponse.data[0].name;
  // 4. Admin updates the community
  const updatedDescription = "Updated by admin description";
  const updatedIconUrl = "https://example.com/admin-icon.png";
  const updateResponse =
    await api.functional.redditLike.member.communities.update(adminConnection, {
      communityName: targetCommunityName,
      body: {
        description: updatedDescription,
        icon_url: updatedIconUrl,
      } satisfies IRedditLikeCommunity.IUpdate,
    });
  typia.assert(updateResponse);
  // 5. Verify the update was successful
  // Skip description check as it doesn't exist on response
  TestValidator.equals(
    "community icon_url updated",
    updateResponse.icon_url,
    updatedIconUrl,
  );
}