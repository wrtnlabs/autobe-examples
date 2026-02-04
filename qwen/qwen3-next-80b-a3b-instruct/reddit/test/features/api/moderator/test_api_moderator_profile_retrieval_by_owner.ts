import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { generate_random_community_platform_owner_communities_create } from "../../../generate/generate_random_community_platform_owner_communities_create";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_moderator_profile_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new community owner
  const ownerJoinConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const ownerJoinResult = await authorize_owner_join(ownerJoinConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    },
  });
  typia.assert(ownerJoinResult);
  // Step 2: Create a community as the owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_login(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    },
  });
  const community =
    await generate_random_community_platform_owner_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Register a new moderator (assign to the community will be handled by the service)
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderatorJoinResult = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      },
    },
  );
  typia.assert(moderatorJoinResult);
  // Step 4: Authenticate as the owner (to retrieve moderator profile)
  const ownerAuthConnection: api.IConnection = { host: connection.host };
  await authorize_owner_login(ownerAuthConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    },
  });
  // Step 5: Retrieve moderator profile using moderator's ID
  const moderatorProfile =
    await api.functional.communityPlatform.moderator.moderators.at(
      ownerAuthConnection,
      {
        moderatorId: moderatorJoinResult.id,
      },
    );
  typia.assert(moderatorProfile);
  // Validate the moderator profile contains the expected structure
  TestValidator.equals(
    "moderator user is summary",
    typeof moderatorProfile.user,
    "object",
  );
  TestValidator.equals(
    "moderator community is summary",
    typeof moderatorProfile.community,
    "object",
  );
  TestValidator.equals(
    "moderator community has name",
    typeof moderatorProfile.community.name,
    "string",
  );
  TestValidator.equals(
    "moderator community has description",
    typeof moderatorProfile.community.description,
    "string",
  );
  TestValidator.equals(
    "moderator community has icon",
    typeof moderatorProfile.community.icon,
    "string",
  );
  TestValidator.equals(
    "moderator community has subscriber_count",
    typeof moderatorProfile.community.subscriber_count,
    "number",
  );
  TestValidator.equals(
    "moderator community has created_at",
    typeof moderatorProfile.community.created_at,
    "string",
  );
  TestValidator.equals(
    "moderator profile has id",
    typeof moderatorProfile.id,
    "string",
  );
}
