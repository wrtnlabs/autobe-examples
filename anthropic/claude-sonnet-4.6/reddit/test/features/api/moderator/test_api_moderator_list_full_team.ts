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

export async function test_api_moderator_list_full_team(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuthorized);
  // 2. Create community (owner is automatically assigned 'owner' role)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Register moderator candidate account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_member_join(
    moderatorConnection,
    {},
  );
  typia.assert(moderatorAuthorized);
  // 4. Assign member 2 as moderator (called by owner)
  const moderatorRecord =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: { member_id: moderatorAuthorized.id },
      },
    );
  typia.assert(moderatorRecord);
  // 5. Call target endpoint: list moderators (public, no auth required)
  const guestConnection: api.IConnection = { host: connection.host };
  const result = await api.functional.community.communities.moderators.index(
    guestConnection,
    {
      communityId: community.id,
      body: {} satisfies ICommunityModerator.IRequest,
    },
  );
  typia.assert(result);
  // 6. Verify pagination metadata
  TestValidator.equals("pagination records", result.pagination.records, 2);
  TestValidator.equals("pagination pages", result.pagination.pages, 1);
  TestValidator.equals("pagination current", result.pagination.current, 1);
  // 7. Verify data length
  TestValidator.equals("data length", result.data.length, 2);
  // 8. Verify ordering: owner first (created_at ASC), moderator second
  TestValidator.equals(
    "first entry role is owner",
    result.data[0]!.role,
    "owner",
  );
  TestValidator.equals(
    "second entry role is moderator",
    result.data[1]!.role,
    "moderator",
  );
  // 9. Verify owner member id matches
  TestValidator.equals(
    "owner member id matches",
    result.data[0]!.member.id,
    ownerAuthorized.id,
  );
  // 10. Verify moderator member id matches
  TestValidator.equals(
    "moderator member id matches",
    result.data[1]!.member.id,
    moderatorAuthorized.id,
  );
}
