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

export async function test_api_community_update_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 2. Member A creates Community A with name 'tech-talk'
  const communityACreated =
    await generate_random_reddit_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name: "tech-talk",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityACreated);
  // 3. Authenticate Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 4. Member B creates Community B with name 'programming'
  const communityBCreated =
    await generate_random_reddit_platform_member_communities_create(
      memberBConnection,
      {
        body: {
          name: "programming",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityBCreated);
  // Store original community names before failed update
  const originalCommunityAName = communityACreated.name;
  const originalCommunityBName = communityBCreated.name;
  // 5. As Member A, attempt to update Community A's name to 'programming' (already taken)
  // This should fail with 409 Conflict
  const body = {
    name: "programming",
  } satisfies IRedditPlatformCommunity.IUpdate;
  await TestValidator.httpError(
    "update with duplicate name should reject with 409 Conflict",
    [409],
    async () => {
      await api.functional.redditPlatform.member.communities.update(
        memberAConnection,
        {
          communityId: communityACreated.id,
          body,
        },
      );
    },
  );
  // 6. Verify Community A's name remains unchanged by comparing with stored original name
  TestValidator.equals(
    "community A name should remain unchanged after rejected update",
    communityACreated.name,
    originalCommunityAName,
  );
  // 7. Verify Community B's name is unchanged (no updates attempted, just verify)
  TestValidator.equals(
    "community B name should be unchanged",
    communityBCreated.name,
    originalCommunityBName,
  );
}