import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_community_moderator_list_owner_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community (creator automatically becomes owner moderator)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. List moderators for the newly created community
  const moderatorList =
    await api.functional.community.communities.moderators.index(connection, {
      communityName: community.name,
      body: {} satisfies ICommunityModerator.IRequest,
    });
  typia.assert(moderatorList);
  // 4. Validate: exactly one moderator (the owner)
  TestValidator.equals("moderator count", moderatorList.data.length, 1);
  // 5. Validate: the single moderator has role 'owner'
  const ownerRecord = moderatorList.data[0];
  TestValidator.equals("role is owner", ownerRecord.role, "owner");
  // 6. Validate: member information matches the creator
  TestValidator.equals("member id matches", ownerRecord.member.id, member.id);
  TestValidator.equals(
    "member username matches",
    ownerRecord.member.username,
    member.username,
  );
  // 7. Validate: appointer is null for owner (auto-assigned on creation)
  TestValidator.equals("appointer is null", ownerRecord.appointer, null);
  // 8. Validate: pagination metadata
  TestValidator.equals("current page", moderatorList.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    moderatorList.pagination.limit > 0,
  );
  TestValidator.equals("total records", moderatorList.pagination.records, 1);
  TestValidator.equals("total pages", moderatorList.pagination.pages, 1);
}
