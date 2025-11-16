import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

export async function test_api_community_public_retrieval(
  connection: api.IConnection,
) {
  // Generate mock community data based on schema -- Assume community already exists in system
  const mockCommunity: ICommunityPlatformCommunity =
    typia.random<ICommunityPlatformCommunity>();

  // Retrieve the community by its code using the public API
  const retrieved: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.at(connection, {
      communityCode: mockCommunity.code,
    });
  typia.assert(retrieved);

  // Validate all publicly accessible fields are present and correct
  TestValidator.equals("retrieved id matches", retrieved.id, mockCommunity.id);
  TestValidator.equals(
    "retrieved code matches",
    retrieved.code,
    mockCommunity.code,
  );
  TestValidator.equals(
    "retrieved name matches",
    retrieved.name,
    mockCommunity.name,
  );
  TestValidator.equals(
    "retrieved description matches",
    retrieved.description,
    mockCommunity.description,
  );
  TestValidator.equals(
    "retrieved created_at matches",
    retrieved.created_at,
    mockCommunity.created_at,
  );
  TestValidator.equals(
    "retrieved updated_at matches",
    retrieved.updated_at,
    mockCommunity.updated_at,
  );
  TestValidator.equals(
    "retrieved status matches",
    retrieved.status,
    mockCommunity.status,
  );
  TestValidator.equals(
    "retrieved member_count matches",
    retrieved.member_count,
    mockCommunity.member_count,
  );
  TestValidator.equals(
    "retrieved post_count matches",
    retrieved.post_count,
    mockCommunity.post_count,
  );
  TestValidator.equals(
    "retrieved tag_count matches",
    retrieved.tag_count,
    mockCommunity.tag_count,
  );
}
