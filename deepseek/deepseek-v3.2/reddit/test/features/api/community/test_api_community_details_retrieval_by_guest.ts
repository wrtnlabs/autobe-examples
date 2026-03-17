import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_details_retrieval_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // 2. Create a community as the member
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      { body: undefined },
    );
  typia.assert(community);
  // 3. Retrieve community details as guest (no authentication)
  const retrieved = await api.functional.communityPlatform.communities.at(
    connection, // guest connection
    { communityId: community.id },
  );
  typia.assert(retrieved);
  // 4. Validate all expected fields exist
  TestValidator.equals("community id matches", retrieved.id, community.id);
  TestValidator.equals(
    "community name matches",
    retrieved.name,
    community.name,
  );
  TestValidator.equals(
    "description matches",
    retrieved.description,
    community.description,
  );
  TestValidator.equals(
    "owner id matches",
    retrieved.owner.id,
    community.owner.id,
  );
  TestValidator.equals("subscriber count is 0", retrieved.subscriber_count, 0);
  TestValidator.equals(
    "created_at matches",
    retrieved.created_at,
    community.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrieved.updated_at,
    community.updated_at,
  );
  TestValidator.predicate("deleted_at is null", retrieved.deleted_at === null);
}
