import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBan";
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

export async function test_api_ban_list_access_denied_for_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the community owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // Step 2: Create a community (owner automatically becomes moderator/owner)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Register a second member who is NOT a moderator of the community
  const regularMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(regularMemberConnection, {});
  // Step 4: As the regular member (non-moderator), attempt to access the ban list
  // This should be denied with a 403 Forbidden response
  await TestValidator.httpError(
    "non-moderator cannot access community ban list",
    403,
    async () => {
      await api.functional.community.member.communities.bans.index(
        regularMemberConnection,
        {
          communityId: community.id,
          body: {} satisfies ICommunityBan.IRequest,
        },
      );
    },
  );
}
