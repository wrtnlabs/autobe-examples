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
 * Test successful retrieval of a public community by an unauthenticated guest.
 * 1. Create a member account and authenticate
 * 2. Use authenticated member to create a community
 * 3. Retrieve the community as an unauthenticated guest using its UUID
 * 4. Validate that the response includes all expected fields
 * 5. Verify that the retrieved community matches the created community's data
 */
export async function test_api_community_retrieval_public_details(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a member account
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
  // Step 2: Create a community using the authenticated member
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const createdCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);
  // Step 3: Retrieve the community as an unauthenticated guest using the base connection
  const retrievedCommunity =
    await api.functional.communityPlatform.communities.at(connection, {
      communityId: createdCommunity.id,
    });
  typia.assert(retrievedCommunity);
  // Step 4: Validate all expected fields are present and correct
  TestValidator.equals(
    "community ID matches",
    retrievedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedCommunity.name,
    createdCommunity.name,
  );
  TestValidator.equals(
    "community description matches",
    retrievedCommunity.description,
    createdCommunity.description,
  );
  TestValidator.equals(
    "subscriber_count should be 0 initially",
    retrievedCommunity.subscriber_count,
    0,
  );
  TestValidator.notEquals(
    "created_at should be set",
    retrievedCommunity.created_at,
    null,
  );
  TestValidator.notEquals(
    "updated_at should be set",
    retrievedCommunity.updated_at,
    null,
  );
  TestValidator.equals(
    "deleted_at should be null",
    retrievedCommunity.deleted_at,
    null,
  );
  // Step 5: Validate owner field contains correct member information
  TestValidator.equals(
    "owner ID matches",
    retrievedCommunity.owner.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "owner email matches",
    retrievedCommunity.owner.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "owner username matches",
    retrievedCommunity.owner.username,
    authorizedMember.username,
  );
  TestValidator.predicate(
    "owner email_verified should be boolean",
    typeof retrievedCommunity.owner.email_verified === "boolean",
  );
  TestValidator.notEquals(
    "owner registered_at should be set",
    retrievedCommunity.owner.registered_at,
    null,
  );
}
