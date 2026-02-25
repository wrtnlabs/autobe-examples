import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_community_moderator_communities_moderators_create } from "../../../generate/generate_random_reddit_community_community_moderator_communities_moderators_create";
import { prepare_random_reddit_community_community_moderator } from "../../../prepare/prepare_random_reddit_community_community_moderator";

export async function test_api_community_moderator_assignment_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community moderator (this implicitly creates a community and assigns the moderator to it)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const owner = await authorize_community_moderator_join(ownerConnection, {
    body: ownerData,
  });
  typia.assert(owner);
  const communityId = owner.community.id;
  // 2. Create target member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRedditCommunityMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // 3. Assign member as moderator (using community from owner's join)
  const assignmentResponse =
    await api.functional.redditCommunity.communityModerator.communities.moderators.create(
      ownerConnection,
      {
        communityId,
        body: {
          userId: member.id,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(assignmentResponse);
  // 4. Validate assignment was successful
  // We cannot validate the moderators list because IRedditCommunityCommunity doesn't expose moderators property
  // But we know the call succeeded because typia.assert passed
  TestValidator.equals(
    "community id matches",
    assignmentResponse.id,
    communityId,
  );
  TestValidator.predicate(
    "assignment returns correct owner",
    () => assignmentResponse.owner.id === owner.id,
  );
}
