import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_creation_owner_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two member accounts
  const memberAJoinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "testpassword123",
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAJoinResult);
  const memberBJoinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "testpassword123",
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberBJoinResult);
  // 2. Create actor-specific connections with authentication
  const memberAConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAJoinResult.token.access },
  };
  const memberBConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberBJoinResult.token.access },
  };
  // 3. Verify owner profile matches creating member
  const expectedOwner: IRedditPlatformMember.ISummary = {
    id: memberAJoinResult.user.id,
    username: memberAJoinResult.user.username,
    display_name: memberAJoinResult.user.display_name,
    karma_score: memberAJoinResult.user.karma_score,
    is_active: memberAJoinResult.user.is_active,
    created_at: memberAJoinResult.user.created_at,
  };
  // 4. Have member A create a community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 5. Verify community owner matches creating member
  TestValidator.equals(
    "owner id matches creator",
    community.owner.id,
    expectedOwner.id,
  );
  TestValidator.equals(
    "owner username matches creator",
    community.owner.username,
    expectedOwner.username,
  );
  TestValidator.equals(
    "owner display_name matches creator",
    community.owner.display_name,
    expectedOwner.display_name,
  );
  TestValidator.equals(
    "owner karma matches creator",
    community.owner.karma_score,
    expectedOwner.karma_score,
  );
  TestValidator.equals(
    "owner active status matches creator",
    community.owner.is_active,
    expectedOwner.is_active,
  );
  TestValidator.equals(
    "owner created_at matches creator",
    community.owner.created_at,
    expectedOwner.created_at,
  );
  // 6. Validate subscriber_count is initialized to 0
  TestValidator.equals(
    "initial subscriber count",
    community.subscriberCount,
    0,
  );
  // 7. Verify community has required fields populated
  TestValidator.predicate(
    "community has valid name",
    community.name.length >= 3 && community.name.length <= 21,
  );
  TestValidator.predicate(
    "community has valid createdAt",
    new Date(community.createdAt).getTime() > 0,
  );
}
