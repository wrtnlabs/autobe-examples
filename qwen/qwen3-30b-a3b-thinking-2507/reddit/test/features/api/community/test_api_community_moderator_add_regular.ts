import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_community_moderator_add_regular(
  connection: api.IConnection,
): Promise<void> {
  // Create a new community as owner
  const community = await generate_random_community_member_communities_create(
    connection,
    {},
  );
  // Prepare moderator data with is_owner = false
  const moderatorBody = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
    is_owner: false,
    community_id: community.id,
  } satisfies ICommunityModerator.ICreate;
  // Add regular moderator to community
  const moderator =
    await generate_random_community_member_communities_moderators_create(
      connection,
      {
        body: moderatorBody,
        params: { communityId: community.id },
      },
    );
  typia.assert(moderator);
  TestValidator.equals("is_owner should be false", moderator.is_owner, false);
}
