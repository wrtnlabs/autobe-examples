import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_creation_with_icon(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // Create community without icon (file upload API not available)
  const communityName = `community_${RandomGenerator.alphabets(8)}`;
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Validate community creation
  TestValidator.equals("name matches", community.name, communityName);
  TestValidator.equals(
    "description matches",
    community.description,
    communityDescription,
  );
  TestValidator.equals("subscriber count is 0", community.subscriberCount, 0);
  TestValidator.equals("owner is creator", community.owner.id, member.id);
  TestValidator.equals("icon is null", community.icon, null);
  TestValidator.equals("not deleted", community.deletedAt, null);
}
