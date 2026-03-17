import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";
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

export async function test_api_community_moderator_list_with_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a new community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Verify creator is the owner
  TestValidator.equals("creator is owner", community.owner.id, member.id);
  // 3. Retrieve moderator list for the created community
  const moderatorList =
    await api.functional.communityPlatform.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformModerator.IRequest,
      },
    );
  typia.assert(moderatorList);
  // 4. Verify pagination metadata
  TestValidator.equals("current page", moderatorList.pagination.current, 1);
  TestValidator.equals("total records", moderatorList.pagination.records, 1);
  TestValidator.equals("total pages", moderatorList.pagination.pages, 1);
  // 5. Verify exactly one moderator entry exists
  TestValidator.equals("moderator count", moderatorList.data.length, 1);
  const moderator = moderatorList.data[0];
  // 6. Verify the moderator has role='owner'
  TestValidator.equals("moderator role", moderator.role, "owner");
  // 7. Verify member information includes required fields
  TestValidator.equals("member id", moderator.member.id, member.id);
  TestValidator.equals(
    "member username",
    moderator.member.username,
    member.username,
  );
  TestValidator.predicate(
    "has displayName",
    moderator.member.displayName === null ||
      typeof moderator.member.displayName === "string",
  );
  TestValidator.predicate(
    "has bio",
    moderator.member.bio === null || typeof moderator.member.bio === "string",
  );
  TestValidator.equals("karma type", typeof moderator.member.karma, "number");
  TestValidator.predicate(
    "has avatar",
    moderator.member.avatar === null ||
      typeof moderator.member.avatar === "object",
  );
  // 8. Verify createdAt timestamp
  TestValidator.predicate(
    "createdAt is valid",
    moderator.createdAt === community.createdAt,
  );
}
