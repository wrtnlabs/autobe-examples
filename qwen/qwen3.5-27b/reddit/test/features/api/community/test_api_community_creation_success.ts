import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test the primary success path for community creation by an authenticated member.
 * 1. Authenticate as a member using join utility
 * 2. Create a new community with valid name (3-50 characters), optional description, and optional icon URL
 * 3. Verify response contains created community with all fields including auto-generated id, owner information (matching authenticated member), subscriber_count initialized to 1, and timestamps
 * 4. Verify community creator is automatically set as owner with full moderation authority
 * 5. Verify owner is automatically subscribed to their own community
 * 6. Verify subscriber count is correctly initialized to 1
 */
export async function test_api_community_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member using join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // 2. Create a new community with valid data
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: undefined,
      },
    );
  typia.assert(community);
  // 3. Verify response contains all required fields
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      community.id,
    ),
  );
  TestValidator.predicate(
    "name length valid",
    community.name.length >= 3 && community.name.length <= 50,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    community.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    community.updated_at !== undefined,
  );
  TestValidator.predicate(
    "is active (not deleted)",
    community.deleted_at === null,
  );
  // 4. Verify community creator is automatically set as owner
  TestValidator.equals(
    "owner matches authenticated member",
    community.owner.id,
    member.id,
  );
  TestValidator.equals(
    "owner username matches",
    community.owner.username,
    member.username,
  );
  TestValidator.equals(
    "owner display_name matches",
    community.owner.display_name,
    member.display_name,
  );
  // 5. Verify owner is automatically subscribed (subscriber_count = 1)
  TestValidator.equals(
    "subscriber count initialized to 1",
    community.subscriber_count,
    1,
  );
  // 6. Verify optional fields are handled correctly
  TestValidator.predicate(
    "description is optional",
    community.description === undefined ||
      community.description === null ||
      typeof community.description === "string",
  );
  TestValidator.predicate(
    "icon is optional",
    community.icon === undefined ||
      community.icon === null ||
      typeof community.icon === "string",
  );
}
