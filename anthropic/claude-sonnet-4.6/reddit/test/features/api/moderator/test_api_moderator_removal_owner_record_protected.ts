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

export async function test_api_moderator_removal_owner_record_protected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member (owner) using the utility function
  // The utility function updates the connection's Authorization header internally
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // Step 2: Create a new community using the generation utility
  // This automatically creates an owner role record in community_moderators
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Retrieve the moderator listing to find the owner's moderator record id
  const moderatorPage =
    await api.functional.community.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          role: "owner",
        } satisfies ICommunityModerator.IRequest,
      },
    );
  typia.assert(moderatorPage);
  // Find the owner's moderator record
  const ownerModeratorRecord = moderatorPage.data.find(
    (m) => m.role === "owner",
  );
  TestValidator.predicate(
    "owner moderator record exists",
    ownerModeratorRecord !== undefined,
  );
  // Step 4: Attempt to delete the owner's own moderator record — should be rejected with 403
  await TestValidator.httpError(
    "owner record cannot be removed",
    403,
    async () => {
      await api.functional.community.member.communities.moderators.erase(
        ownerConnection,
        {
          communityId: community.id,
          moderatorId: ownerModeratorRecord!.id,
        },
      );
    },
  );
}
