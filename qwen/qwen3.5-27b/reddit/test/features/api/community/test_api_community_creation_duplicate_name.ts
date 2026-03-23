import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
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

/**
 * Test community name uniqueness constraint.
 * 1. Authenticate as a member using join
 * 2. Create a first community with a specific name
 * 3. Attempt to create a second community with the same name
 * 4. Verify the second creation fails with 409 conflict error
 */
export async function test_api_community_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create first community with a specific name
  const communityName = `test-community-${RandomGenerator.alphabets(8)}`;
  const firstCommunity =
    await api.functional.redditClone.member.communities.create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: "First test community",
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  // 3. Attempt to create second community with the same name
  await TestValidator.httpError(
    "duplicate community name should fail with 409",
    409,
    async () => {
      await api.functional.redditClone.member.communities.create(
        memberConnection,
        {
          body: {
            name: communityName,
            description: "Second test community with duplicate name",
          } satisfies IRedditCloneCommunity.ICreate,
        },
      );
    },
  );
}
