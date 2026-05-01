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

export async function test_api_community_moderator_addition_by_existing_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Owner creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create member B account
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 4. Create member C account
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  // 5. Owner adds member B as moderator
  const moderatorB =
    await generate_random_community_hub_member_communities_moderators_create(
      ownerConnection,
      {
        body: { username: memberB.username },
        params: { communityName: community.name },
      },
    );
  typia.assert(moderatorB);
  // 6. Member B (moderator) adds member C as moderator
  const moderatorC =
    await generate_random_community_hub_member_communities_moderators_create(
      memberBConnection,
      {
        body: { username: memberC.username },
        params: { communityName: community.name },
      },
    );
  typia.assert(moderatorC);
  // 7. Validate the delegation chain
  TestValidator.equals(
    "moderator C role is moderator",
    moderatorC.role,
    "moderator",
  );
  TestValidator.equals(
    "moderator C member references member C",
    moderatorC.member.id,
    memberC.id,
  );
  TestValidator.predicate(
    "moderator C addedByMember is not null",
    moderatorC.addedByMember !== null,
  );
  if (moderatorC.addedByMember !== null) {
    TestValidator.equals(
      "addedByMember references member B (the delegating moderator)",
      moderatorC.addedByMember.id,
      memberB.id,
    );
  }
}
