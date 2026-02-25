import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_owner_communities_create } from "../../../generate/generate_random_reddit_clone_owner_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_community_member_deletion_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login owner user
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerUser = await api.functional.redditClone.auth.owner.join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditCloneOwner.IJoin,
    },
  );
  typia.assert(ownerUser);
  // 2. Create community as owner
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Register and login member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberUser = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(memberUser);
  // 4. Member attempts to delete community (should be denied)
  await TestValidator.error("member cannot delete community", async () => {
    await api.functional.redditClone.owner.communities.erase(memberConnection, {
      communityId: community.id,
    });
  });
  // 5. Verify community still exists after failed deletion attempt
  const retrievedCommunity =
    await api.functional.redditClone.owner.communities.create(ownerConnection, {
      body: {
        name: community.name,
        description: community.description,
      } satisfies IRedditCloneCommunity.ICreate,
    });
  typia.assert(retrievedCommunity);
  TestValidator.equals(
    "community ID matches original",
    retrievedCommunity.id,
    community.id,
  );
  // 6. Owner can successfully delete the community
  await api.functional.redditClone.owner.communities.erase(ownerConnection, {
    communityId: retrievedCommunity.id,
  });
}
