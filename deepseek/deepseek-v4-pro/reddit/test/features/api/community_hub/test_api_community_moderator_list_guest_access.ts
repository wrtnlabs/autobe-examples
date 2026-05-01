import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";

export async function test_api_community_moderator_list_guest_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member to create a community
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a community owned by the authenticated member
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Access the moderator list as an unauthenticated guest
  const guestConnection: api.IConnection = { host: connection.host };
  const moderatorPage =
    await api.functional.communityHub.communities.moderators.index(
      guestConnection,
      {
        communityName: community.name,
        body: {} satisfies ICommunityHubCommunityModerator.IRequest,
      },
    );
  typia.assert(moderatorPage);
  // 4. Validate the owner appears in the moderator list
  TestValidator.predicate(
    "moderator list is not empty",
    moderatorPage.data.length > 0,
  );
  TestValidator.equals(
    "first entry is the owner",
    moderatorPage.data[0].role,
    "owner",
  );
  TestValidator.equals(
    "owner username matches the community creator",
    moderatorPage.data[0].member.username,
    member.username,
  );
  TestValidator.equals(
    "owner added_by is null (system-assigned, not appointed)",
    moderatorPage.data[0].added_by,
    null,
  );
}
