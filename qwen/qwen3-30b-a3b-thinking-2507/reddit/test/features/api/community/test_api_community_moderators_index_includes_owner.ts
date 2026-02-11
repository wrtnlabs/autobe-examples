import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
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

export async function test_api_community_moderators_index_includes_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.community.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
      } satisfies ICommunityMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create community as owner
  const community = await api.functional.community.member.communities.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        icon_url: "https://example.com/icon.png",
      } satisfies ICommunityCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Get community moderators
  const moderators =
    await api.functional.community.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityModerator.IRequest,
      },
    );
  typia.assert(moderators);
  // 4. Validate owner is listed as moderator with is_owner=true
  const owner = moderators.data.find((m) => m.user.id === member.id);
  TestValidator.equals(
    "owner should be in moderators",
    owner !== undefined,
    true,
  );
  TestValidator.equals(
    "owner should be marked as owner",
    owner?.is_owner,
    true,
  );
}
