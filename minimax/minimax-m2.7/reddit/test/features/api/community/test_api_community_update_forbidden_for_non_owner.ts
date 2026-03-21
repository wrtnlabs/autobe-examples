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

export async function test_api_community_update_forbidden_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member1 authenticates and creates a community
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  const originalDescription = RandomGenerator.paragraph({ sentences: 2 });
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          description: originalDescription,
        },
      },
    );
  typia.assert(community);
  // Step 2: Member2 authenticates (non-owner)
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // Step 3 & 4: Member2 attempts to update community and should receive 403 Forbidden
  await TestValidator.error("non-owner cannot update community", async () => {
    await api.functional.redditClone.member.communities.update(
      member2Connection,
      {
        communityName: community.name,
        body: {
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneCommunityBan.IUpdate,
      },
    );
  });
  // Step 5: Verify community description remains unchanged - owner can still update successfully
  const updatedByOwner =
    await api.functional.redditClone.member.communities.update(
      member1Connection,
      {
        communityName: community.name,
        body: {
          description: "Updated by owner successfully",
        } satisfies IRedditCloneCommunityBan.IUpdate,
      },
    );
  typia.assert(updatedByOwner);
  TestValidator.notEquals(
    "description changed by owner",
    updatedByOwner.description,
    originalDescription,
  );
  TestValidator.equals(
    "owner can update",
    updatedByOwner.description,
    "Updated by owner successfully",
  );
}
