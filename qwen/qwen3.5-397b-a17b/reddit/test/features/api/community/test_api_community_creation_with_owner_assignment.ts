import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_community_creation_with_owner_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare member credentials
  const memberEmail = typia.random<(string & tags.Format<"email">)>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberUsername = RandomGenerator.name(1);
  // 2. Register and authenticate as a new member who will own the community
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: typia.random<(string & tags.Format<"uri">)>(),
      referrer: typia.random<(string & tags.Format<"uri">)>(),
      ip: typia.random<(string & tags.Format<"ipv4">)>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResult);
  // 3. Create a new community with unique name and description
  const communityName = `community_${RandomGenerator.alphabets(8)}`;
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });
  const iconImageUri = typia.random<(string & tags.Format<"uri">)>();
  const community =
    await api.functional.redditCommunity.member.communities.create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: communityDescription,
          iconImageUri: iconImageUri,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Verify community was created with all provided fields
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "community description matches",
    community.description,
    communityDescription,
  );
  // 5. Verify the creating member is assigned as owner
  TestValidator.equals(
    "owner id matches creator",
    community.owner.id,
    authResult.id,
  );
  TestValidator.equals(
    "owner username matches creator",
    community.owner.username,
    memberUsername,
  );
  // 6. Verify subscriber count is initialized to zero
  TestValidator.equals(
    "subscriber count initialized",
    community.subscriber_count,
    0,
  );
  // 7. Verify timestamps are present
  TestValidator.predicate(
    "created_at is valid date-time",
    () => new Date(community.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => new Date(community.updated_at).getTime() > 0,
  );
  // 8. Verify community icon was created
  TestValidator.predicate(
    "community has icon",
    () => community.communityIcons.length > 0,
  );
  // 9. Verify deleted_at is null (community is active)
  TestValidator.equals("community not deleted", community.deleted_at, null);
}