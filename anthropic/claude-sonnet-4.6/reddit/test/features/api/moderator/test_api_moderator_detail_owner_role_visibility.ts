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

export async function test_api_moderator_detail_owner_role_visibility(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member who will become the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuthorized);
  // Step 2: Create a new community with the owner connection
  // This auto-assigns an 'owner' role in community_moderators for the creating member
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Retrieve the moderation team list to find the owner's moderator record ID
  // Use a guest connection (no auth headers) to test public accessibility
  const guestConnection: api.IConnection = { host: connection.host };
  const moderatorPage =
    await api.functional.community.communities.moderators.index(
      guestConnection,
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
    (mod) => mod.role === "owner",
  );
  TestValidator.predicate(
    "owner moderator record exists",
    ownerModeratorRecord !== undefined,
  );
  // Step 4: Retrieve the specific moderator record via GET endpoint (unauthenticated)
  const moderatorDetail =
    await api.functional.community.communities.moderators.at(guestConnection, {
      communityId: community.id,
      moderatorId: ownerModeratorRecord!.id,
    });
  typia.assert(moderatorDetail);
  // Validations
  // Role must be 'owner'
  TestValidator.equals("role is owner", moderatorDetail.role, "owner");
  // Member must correspond to the community owner
  TestValidator.equals(
    "member id matches owner",
    moderatorDetail.member.id,
    ownerAuthorized.id,
  );
  // Member username must match
  TestValidator.equals(
    "member username matches owner",
    moderatorDetail.member.username,
    ownerAuthorized.username,
  );
  // Community id must match
  TestValidator.equals(
    "community id matches",
    moderatorDetail.community.id,
    community.id,
  );
  // Community name must match
  TestValidator.equals(
    "community name matches",
    moderatorDetail.community.name,
    community.name,
  );
}
