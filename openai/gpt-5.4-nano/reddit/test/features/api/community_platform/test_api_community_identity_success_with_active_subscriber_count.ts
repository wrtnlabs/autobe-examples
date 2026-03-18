import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_identity_success_with_active_subscriber_count(
  connection: api.IConnection,
): Promise<void> {
  // Since the provided SDK surface includes only the identity GET endpoint
  // (no community/subscription creation or listing helpers), this test
  // focuses on the response contract and deterministic subscriberCount
  // computation for a single communityId.
  const clientConnection: api.IConnection = { host: connection.host };
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const identity1 = await api.functional.communityPlatform.communities.at(
    clientConnection,
    { communityId },
  );
  typia.assert(identity1);
  const identity2 = await api.functional.communityPlatform.communities.at(
    clientConnection,
    { communityId },
  );
  typia.assert(identity2);
  TestValidator.equals("community id matches", identity1.id, communityId);
  // Determinism under stable data.
  TestValidator.equals(
    "subscriberCount deterministic",
    identity1.subscriberCount,
    identity2.subscriberCount,
  );
  // Validate owner DTO shape.
  typia.assert<ICommunityPlatformMember.ISummary>(identity1.owner);
  // Basic identity fields presence (type-validations are already done by typia.assert).
  TestValidator.predicate(
    "name is not empty",
    identity1.name.trim().length > 0,
  );
  TestValidator.predicate(
    "description is not empty",
    identity1.description.trim().length > 0,
  );
  TestValidator.predicate(
    "iconHref is not empty",
    identity1.iconHref.trim().length > 0,
  );
}
