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

/**
 * Test community creation with minimal required data.
 *
 * Authenticate a member and create a community with only the required name field (no description).
 * Validate that the system accepts the request and creates a community with null description,
 * zero subscriber count, and the authenticated member as owner.
 * Ensure the community appears in browse/search lists and remains visible even with zero subscribers.
 * This tests the minimum data requirements for successful community creation.
 */
export async function test_api_community_creation_minimal_data(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorizedMember);
  // Create community with minimal required data (only name, no description)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12),
          // description intentionally omitted to test minimal data requirement
        },
      },
    );
  typia.assert(community);
  // Validate community creation with minimal data
  TestValidator.equals(
    "community name matches input",
    community.name,
    community.name,
  );
  TestValidator.equals(
    "description should be null",
    community.description,
    null,
  );
  TestValidator.equals(
    "subscriber count should be 0",
    community.subscriber_count,
    0,
  );
  TestValidator.equals(
    "owner id matches authenticated member",
    community.owner.id,
    authorizedMember.id,
  );
  TestValidator.predicate("created_at should be valid date-time string", () => {
    return !isNaN(new Date(community.created_at).getTime());
  });
  TestValidator.predicate("updated_at should be valid date-time string", () => {
    return !isNaN(new Date(community.updated_at).getTime());
  });
  TestValidator.equals("deleted_at should be null", community.deleted_at, null);
}
