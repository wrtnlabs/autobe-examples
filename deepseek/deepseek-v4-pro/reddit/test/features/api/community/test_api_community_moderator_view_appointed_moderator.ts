import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_member_communities_moderators_create } from "../../../generate/generate_random_community_hub_member_communities_moderators_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_community_moderator } from "../../../prepare/prepare_random_community_hub_community_moderator";

export async function test_api_community_moderator_view_appointed_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (future community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2. Register member B (future moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 3. Member A creates a community (becomes permanent owner)
  const community =
    await generate_random_community_hub_member_communities_create(
      memberAConnection,
      {},
    );
  // 4. Owner (member A) appoints member B as moderator
  const appointedModerator =
    await generate_random_community_hub_member_communities_moderators_create(
      memberAConnection,
      {
        params: { communityName: community.name },
        body: { username: memberB.username },
      },
    );
  // 5. Retrieve the moderator record via the public GET endpoint
  const retrieved = await api.functional.communityHub.communities.moderators.at(
    connection,
    {
      communityName: community.name,
      moderatorId: memberB.id,
    },
  );
  typia.assert(retrieved);
  // 6. Validate moderator record details
  TestValidator.equals("role is moderator", retrieved.role, "moderator");
  TestValidator.equals(
    "member id matches appointee",
    retrieved.member.id,
    memberB.id,
  );
  TestValidator.equals(
    "member username matches appointee",
    retrieved.member.username,
    memberB.username,
  );
  TestValidator.predicate(
    "addedByMember is non-null for appointed moderator",
    retrieved.addedByMember !== null,
  );
  typia.assertGuard(retrieved.addedByMember!);
  TestValidator.equals(
    "appointer id matches owner",
    retrieved.addedByMember.id,
    memberA.id,
  );
  TestValidator.equals(
    "appointer username matches owner",
    retrieved.addedByMember.username,
    memberA.username,
  );
}
