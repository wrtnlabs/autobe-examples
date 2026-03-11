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

export async function test_api_community_update_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A account and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberA);
  // 2. Member A creates a community
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await api.functional.redditPlatform.member.communities.create(
      communityConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-zA-Z0-9_-]+$">
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create Member B account and authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberB);
  // 4. Member B attempts to update Community A → should fail with 403
  const updateBody: IRedditPlatformCommunity.IUpdate = {
    name: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<21> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditPlatformCommunity.IUpdate;
  await TestValidator.error("non-owner cannot update community", async () => {
    await api.functional.redditPlatform.member.communities.update(
      memberBConnection,
      {
        communityId: community.id,
        body: updateBody,
      },
    );
  });
  // 5. Verify community properties remain unchanged after failed update
  // Fetch community to confirm it wasn't modified by Member B
  const fetchConnection: api.IConnection = { host: connection.host };
  const currentCommunity =
    await api.functional.redditPlatform.member.communities.update(
      fetchConnection,
      {
        communityId: community.id,
        body: {},
      },
    );
  typia.assert(currentCommunity);
  TestValidator.equals(
    "community unchanged after non-owner update attempt",
    currentCommunity.description,
    community.description,
  );
  TestValidator.equals(
    "community name unchanged after non-owner update attempt",
    currentCommunity.name,
    community.name,
  );
  // 6. Member A (owner) should be able to update their community
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const successfulUpdate =
    await api.functional.redditPlatform.member.communities.update(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          description: newDescription,
        } satisfies IRedditPlatformCommunity.IUpdate,
      },
    );
  typia.assert(successfulUpdate);
  TestValidator.equals(
    "owner successfully updated community description",
    successfulUpdate.description,
    newDescription,
  );
  TestValidator.notEquals(
    "community description was actually updated",
    community.description,
    newDescription,
  );
}
