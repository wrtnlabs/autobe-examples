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

export async function test_api_community_update_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const joinConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: RandomGenerator.paragraph({ sentences: 1 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(auth);
  // 2. Create community owned by this member
  const createConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_reddit_platform_member_communities_create(
      createConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(community);
  typia.assert(community.owner.id === auth.user.id);
  const createdAt = community.updatedAt;
  const originalName = community.name;
  const originalDescription = community.description;
  const originalIconUrl = community.iconUrl;
  // 3. Update community with new values
  const updateConnection: api.IConnection = { host: connection.host };
  const newName = RandomGenerator.alphaNumeric(8);
  const newDescription = RandomGenerator.paragraph({ sentences: 4 });
  const newIconUrl = typia.random<string & tags.Format<"uri">>();
  const updatedCommunity =
    await api.functional.redditPlatform.member.communities.update(
      updateConnection,
      {
        communityId: community.id,
        body: {
          name: newName,
          description: newDescription,
          icon_url: newIconUrl,
        },
      },
    );
  typia.assert(updatedCommunity);
  // 4. Verify response contains updated values
  TestValidator.equals(
    "community name updated",
    updatedCommunity.name,
    newName,
  );
  TestValidator.equals(
    "community description updated",
    updatedCommunity.description,
    newDescription,
  );
  TestValidator.equals(
    "community icon URL updated",
    updatedCommunity.iconUrl,
    newIconUrl,
  );
  // 5. Verify updated_at timestamp reflects modification
  const updatedAt = new Date(updatedCommunity.updatedAt);
  const createdTime = new Date(updatedCommunity.createdAt);
  TestValidator.predicate(
    "updated_at is after created_at",
    () => updatedAt.getTime() > createdTime.getTime(),
  );
  TestValidator.predicate(
    "updated_at is recent (within last minute)",
    () => updatedAt.getTime() > Date.now() - 60 * 1000,
  );
  // 6. Verify owner remains the same
  TestValidator.equals(
    "owner remains unchanged",
    updatedCommunity.owner.id,
    auth.user.id,
  );
  TestValidator.equals(
    "subscriber count unchanged",
    updatedCommunity.subscriberCount,
    community.subscriberCount,
  );
}
