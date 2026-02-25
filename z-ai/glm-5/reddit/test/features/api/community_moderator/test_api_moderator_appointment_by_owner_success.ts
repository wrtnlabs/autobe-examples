import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
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

export async function test_api_moderator_appointment_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
    },
  });
  typia.assert(owner);
  // 2. Owner creates a community (becomes owner automatically)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Create target member account
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
    },
  });
  typia.assert(targetMember);
  // 4. Subscribe target member to the community (required for moderator appointment)
  const subscription =
    await api.functional.community.member.communities.subscribe(
      targetConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 5. Owner appoints target member as moderator
  const moderator =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          member_username: targetMember.username,
        },
      },
    );
  typia.assert(moderator);
  // 6. Validate moderator appointment response
  TestValidator.equals(
    "is_owner is false for appointed moderator",
    moderator.is_owner,
    false,
  );
  TestValidator.equals(
    "moderator username matches target",
    moderator.member.username,
    targetMember.username,
  );
  TestValidator.equals(
    "appointer is the community owner",
    moderator.appointer?.username,
    owner.username,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    new Date(moderator.created_at).getTime() > 0,
  );
}