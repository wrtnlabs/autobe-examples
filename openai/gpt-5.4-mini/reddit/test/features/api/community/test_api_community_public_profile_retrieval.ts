import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_public_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const publicConnection: api.IConnection = { host: connection.host };
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const community = await api.functional.communityPlatform.communities.at(
    publicConnection,
    {
      communityId,
    },
  );
  typia.assert(community);
  TestValidator.equals(
    "community id matches requested id",
    community.id,
    communityId,
  );
  TestValidator.predicate(
    "community name is available",
    community.name.length > 0,
  );
  TestValidator.predicate(
    "community description is available",
    community.description.length > 0,
  );
  TestValidator.predicate(
    "community icon image url is available",
    community.iconImageUrl.length > 0,
  );
  TestValidator.predicate(
    "community status is available",
    community.status.length > 0,
  );
  TestValidator.predicate(
    "community createdAt is available",
    community.createdAt.length > 0,
  );
  TestValidator.predicate(
    "community updatedAt is available",
    community.updatedAt.length > 0,
  );
  TestValidator.equals(
    "community deletedAt is null when active",
    community.deletedAt,
    null,
  );
}
