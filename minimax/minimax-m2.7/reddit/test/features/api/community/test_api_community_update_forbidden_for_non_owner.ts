import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_community_update_forbidden_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers and creates a community
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: `user_a_${RandomGenerator.alphabets(8)}`,
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(8)}`,
          description: "Test community description",
        },
      },
    );
  typia.assert(community);
  // Store original values for validation
  const originalName = community.name;
  const originalDescription = community.description;
  const originalOwnerId = community.member.id;
  // 2. Member B registers (different user, not the owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: `user_b_${RandomGenerator.alphabets(8)}`,
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  // 3. Member B attempts to update Member A's community (should fail)
  await TestValidator.httpError(
    "non-owner cannot update community",
    403,
    async () =>
      await api.functional.redditClone.member.communities.update(
        memberBConnection,
        {
          communityId: community.id,
          body: {
            description: "Unauthorized description change",
          } satisfies IRedditCloneCommunity.IUpdate,
        },
      ),
  );
  // 4. Verify community remains unchanged by checking as owner
  const unchangedCommunity =
    await api.functional.redditClone.member.communities.update(
      memberAConnection,
      {
        communityId: community.id,
        body: {} satisfies IRedditCloneCommunity.IUpdate,
      },
    );
  typia.assert(unchangedCommunity);
  TestValidator.equals(
    "community name unchanged",
    unchangedCommunity.name,
    originalName,
  );
  TestValidator.equals(
    "community description unchanged",
    unchangedCommunity.description,
    originalDescription,
  );
  TestValidator.equals(
    "community owner unchanged",
    unchangedCommunity.member.id,
    originalOwnerId,
  );
}
