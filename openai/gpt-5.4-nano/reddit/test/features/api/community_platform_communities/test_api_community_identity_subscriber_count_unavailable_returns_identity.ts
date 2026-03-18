import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_identity_subscriber_count_unavailable_returns_identity(
  connection: api.IConnection,
): Promise<void> {
  // Connection isolation: use base connection only (never directly)
  const viewerConnection: api.IConnection = { host: connection.host };
  // Use a UUID as communityId. In environments that provide fixtures where
  // subscriber-count aggregation is unavailable, the service must still return
  // community identity with subscriberCount = null.
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const output = await api.functional.communityPlatform.communities.at(
    viewerConnection,
    {
      communityId,
    },
  );
  typia.assert(output);
  // Identity fields must still be present.
  TestValidator.equals("community id matches request", output.id, communityId);
  TestValidator.predicate(
    "community name is non-empty",
    output.name.trim().length > 0,
  );
  TestValidator.predicate(
    "owner display_name is non-empty",
    output.owner.display_name.trim().length > 0,
  );
  // Business resilience: subscriberCount must never block identity rendering.
  // DTO contract allows `null` for unavailable; validate that server returns
  // a valid unavailable representation rather than failing the request.
  TestValidator.predicate(
    "subscriberCount is either unavailable (null) or a non-negative number",
    output.subscriberCount === null || output.subscriberCount >= 0,
  );
}
