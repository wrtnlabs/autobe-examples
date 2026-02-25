import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_community_owner_communities_moderators_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_moderators_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_community_moderator } from "../../../prepare/prepare_random_reddit_community_community_moderator";

export async function test_api_community_owner_remove_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCommunityCommunityOwner.IJoin;
  const owner = await authorize_community_owner_join(ownerConnection, {
    body: ownerData,
  });
  typia.assert(owner);
  // 2. Create member account to be promoted as moderator
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCommunityMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // 3. Community owner creates a new community
  const community =
    await api.functional.redditCommunity.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Assign member as moderator to the community
  const moderatorAssignment =
    await api.functional.redditCommunity.communityOwner.communities.moderators.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          userId: member.id,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Verify moderator was assigned
  TestValidator.equals(
    "moderator user ID matches",
    moderatorAssignment.user.id,
    member.id,
  );
  TestValidator.equals(
    "moderator community ID matches",
    moderatorAssignment.community.id,
    community.id,
  );
  // 6. Community owner removes the moderator
  await api.functional.redditCommunity.communityOwner.communities.moderators.erase(
    ownerConnection,
    {
      communityId: community.id,
      userId: member.id,
    },
  );
  // 7. Verify member still exists as regular member (can still post)
  // Re-authenticate member to get current session and profile data
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const memberLogin = await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberData.email,
      password: memberData.password,
    } satisfies IRedditCommunityMember.ILogin,
  });
  typia.assert(memberLogin);
  // Validate that the member's profile data matches original creation data
  TestValidator.equals(
    "member profile username matches",
    memberLogin.username,
    memberData.username,
  );
  TestValidator.equals(
    "member profile display name matches",
    memberLogin.display_name,
    memberData.displayName,
  );
  TestValidator.equals(
    "member profile email matches",
    memberLogin.email,
    memberData.email,
  );
}
