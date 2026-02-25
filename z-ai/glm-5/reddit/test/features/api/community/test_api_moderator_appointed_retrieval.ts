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

export async function test_api_moderator_appointed_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create owner member account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      username: `owner_${RandomGenerator.alphaNumeric(8)}`,
    },
  });
  typia.assert(owner);
  // Create second member account (will be appointed as moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const appointedMember = await authorize_member_join(moderatorConnection, {
    body: {
      username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
    },
  });
  typia.assert(appointedMember);
  // Owner creates community (becomes owner-moderator automatically)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Second member subscribes to the community (required before becoming moderator)
  const subscription =
    await api.functional.community.member.communities.subscribe(
      moderatorConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // Owner appoints the second member as moderator
  const appointedModerator =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          member_username: appointedMember.username,
        },
      },
    );
  typia.assert(appointedModerator);
  // Retrieve the appointed moderator's record
  const retrievedModerator =
    await api.functional.community.communities.moderators.at(connection, {
      communityName: community.name,
      moderatorId: appointedModerator.id,
    });
  typia.assert(retrievedModerator);
  // Verify moderator record properties
  TestValidator.equals(
    "moderator id",
    retrievedModerator.id,
    appointedModerator.id,
  );
  TestValidator.equals("is_owner", retrievedModerator.is_owner, false);
  TestValidator.equals(
    "member id",
    retrievedModerator.member.id,
    appointedMember.id,
  );
  TestValidator.equals(
    "member username",
    retrievedModerator.member.username,
    appointedMember.username,
  );
  // Verify appointer information is populated
  TestValidator.predicate(
    "appointer exists",
    retrievedModerator.appointer !== null,
  );
  if (retrievedModerator.appointer !== null) {
    TestValidator.equals(
      "appointer id",
      retrievedModerator.appointer.id,
      owner.id,
    );
    TestValidator.equals(
      "appointer username",
      retrievedModerator.appointer.username,
      owner.username,
    );
  }
  // Verify created_at timestamp exists
  TestValidator.predicate(
    "created_at exists",
    retrievedModerator.created_at !== undefined,
  );
}
