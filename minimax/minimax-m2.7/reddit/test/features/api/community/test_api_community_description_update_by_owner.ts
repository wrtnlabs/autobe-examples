import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";

export async function test_api_community_description_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as member (community owner)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community with initial description
  const originalDescription = "Original Description";
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: originalDescription,
        },
      },
    );
  typia.assert(community);
  // Store original updated_at timestamp for comparison
  const originalUpdatedAt = community.updated_at;
  // 3. Wait briefly to ensure updated_at will differ
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Update the community description
  const updatedDescription = "Updated Description";
  const updated = await api.functional.redditClone.member.communities.update(
    memberConnection,
    {
      communityName: community.name,
      body: {
        description: updatedDescription,
      },
    },
  );
  typia.assert(updated);
  // 5. Validate description is updated
  TestValidator.equals(
    "description updated",
    updated.description,
    updatedDescription,
  );
  // 6. Validate updated_at timestamp reflects the update (should be different/newer)
  TestValidator.predicate(
    "updated_at changed",
    new Date(updated.updated_at) > new Date(originalUpdatedAt),
  );
}
