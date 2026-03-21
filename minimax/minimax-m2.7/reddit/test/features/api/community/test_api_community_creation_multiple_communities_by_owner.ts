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

export async function test_api_community_creation_multiple_communities_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditCloneMemberSession.IAuthorized =
    await authorize_member_join(memberConnection, {});
  // 2. Create first community
  const community1: IRedditCloneCommunityBan =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Create second community
  const community2: IRedditCloneCommunityBan =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  // 4. Create third community
  const community3: IRedditCloneCommunityBan =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  // Validate responses
  typia.assert(community1);
  typia.assert(community2);
  typia.assert(community3);
  // Verify all three communities have distinct UUIDs
  TestValidator.notEquals(
    "community1 ID differs from community2",
    community1.id,
    community2.id,
  );
  TestValidator.notEquals(
    "community2 ID differs from community3",
    community2.id,
    community3.id,
  );
  TestValidator.notEquals(
    "community1 ID differs from community3",
    community1.id,
    community3.id,
  );
  // Verify owner is set to the authenticated member for all communities
  TestValidator.equals(
    "community1 owner matches member",
    community1.owner.id,
    authorized.id,
  );
  TestValidator.equals(
    "community2 owner matches member",
    community2.owner.id,
    authorized.id,
  );
  TestValidator.equals(
    "community3 owner matches member",
    community3.owner.id,
    authorized.id,
  );
  // Verify subscriber_count is 0 for all communities
  TestValidator.equals(
    "community1 subscriber_count is 0",
    community1.subscriber_count,
    0,
  );
  TestValidator.equals(
    "community2 subscriber_count is 0",
    community2.subscriber_count,
    0,
  );
  TestValidator.equals(
    "community3 subscriber_count is 0",
    community3.subscriber_count,
    0,
  );
  // Verify all three communities have distinct names
  TestValidator.notEquals(
    "community1 name differs from community2",
    community1.name,
    community2.name,
  );
  TestValidator.notEquals(
    "community2 name differs from community3",
    community2.name,
    community3.name,
  );
  TestValidator.notEquals(
    "community1 name differs from community3",
    community1.name,
    community3.name,
  );
  // Verify all three communities have distinct creation timestamps
  TestValidator.predicate(
    "community1 created_at differs from community2",
    community1.created_at !== community2.created_at,
  );
  TestValidator.predicate(
    "community2 created_at differs from community3",
    community2.created_at !== community3.created_at,
  );
  TestValidator.predicate(
    "community1 created_at differs from community3",
    community1.created_at !== community3.created_at,
  );
}
