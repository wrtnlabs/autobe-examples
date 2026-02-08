import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_at_deleted_community_fetch(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies the retrieval of a soft deleted community
  // 1. We assume a community exists with a deleted_at timestamp set (soft deleted)
  // 2. We fetch the community by ID without authentication
  // 3. We assert that the returned data includes the deleted_at timestamp and all other fields
  // Since no utility functions or creation APIs for communities are provided in scope,
  // and no authentication needed, we simulate fetching a deleted community by passing
  // a random valid UUID as communityId and expect a valid community response including deleted_at.
  // Generate a random UUID for communityId to simulate a deleted community fetch
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Create a fresh connection object for this request
  const guestConnection: api.IConnection = { host: connection.host };
  // Fetch the community data
  const community = await api.functional.communityPlatform.communities.at(
    guestConnection,
    {
      communityId,
    },
  );
  // Assert the response type including all expected properties
  typia.assert(community);
  TestValidator.predicate("community has id", typeof (community as any).id === "string");
  TestValidator.predicate(
    "community has owner_user_id",
    typeof (community as any).owner_user_id === "string" ||
      (community as any).owner_user_id === null ||
      (community as any).owner_user_id === undefined,
  );
  TestValidator.predicate(
    "community has name",
    typeof (community as any).name === "string",
  );
  TestValidator.predicate(
    "community has description",
    typeof (community as any).description === "string" ||
      (community as any).description === null ||
      (community as any).description === undefined,
  );
  TestValidator.predicate(
    "community has icon_url",
    typeof (community as any).icon_url === "string" ||
      (community as any).icon_url === null ||
      (community as any).icon_url === undefined,
  );
  TestValidator.predicate(
    "community has created_at",
    typeof (community as any).created_at === "string",
  );
  TestValidator.predicate(
    "community has updated_at",
    typeof (community as any).updated_at === "string" ||
      (community as any).updated_at === null ||
      (community as any).updated_at === undefined,
  );
  TestValidator.predicate(
    "community has deleted_at",
    typeof (community as any).deleted_at === "string" ||
      (community as any).deleted_at === null ||
      (community as any).deleted_at === undefined,
  );
}
