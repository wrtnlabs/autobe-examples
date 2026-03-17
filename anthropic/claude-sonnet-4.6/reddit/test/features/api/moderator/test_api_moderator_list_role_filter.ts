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
import { generate_random_community_member_communities_moderators_create } from "../../../generate/generate_random_community_member_communities_moderators_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_moderator } from "../../../prepare/prepare_random_community_moderator";

export async function test_api_moderator_list_role_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register owner member account
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // Step 2: Create a community (owner becomes the community creator)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Register a second member account (to be assigned as moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorMember);
  // Step 4: Assign the second member as moderator in the community
  const moderatorRecord =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: { member_id: moderatorMember.id },
      },
    );
  typia.assert(moderatorRecord);
  // Use a public connection for listing (no auth required)
  const publicConnection: api.IConnection = { host: connection.host };
  // Test A: filter by role='owner'
  const ownerFilterResult =
    await api.functional.community.communities.moderators.index(
      publicConnection,
      {
        communityId: community.id,
        body: { role: "owner" } satisfies ICommunityModerator.IRequest,
      },
    );
  typia.assert(ownerFilterResult);
  TestValidator.equals(
    "owner filter: records count",
    ownerFilterResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "owner filter: data length",
    ownerFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "owner filter: role is owner",
    ownerFilterResult.data[0]!.role,
    "owner",
  );
  TestValidator.predicate(
    "owner filter: no moderator entries",
    ownerFilterResult.data.every((m) => m.role !== "moderator"),
  );
  // Test B: filter by role='moderator'
  const moderatorFilterResult =
    await api.functional.community.communities.moderators.index(
      publicConnection,
      {
        communityId: community.id,
        body: { role: "moderator" } satisfies ICommunityModerator.IRequest,
      },
    );
  typia.assert(moderatorFilterResult);
  TestValidator.equals(
    "moderator filter: records count",
    moderatorFilterResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "moderator filter: data length",
    moderatorFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "moderator filter: role is moderator",
    moderatorFilterResult.data[0]!.role,
    "moderator",
  );
  TestValidator.predicate(
    "moderator filter: no owner entries",
    moderatorFilterResult.data.every((m) => m.role !== "owner"),
  );
}
