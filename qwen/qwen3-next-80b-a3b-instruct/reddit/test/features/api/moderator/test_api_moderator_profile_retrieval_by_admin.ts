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
export async function test_api_moderator_profile_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail: string = typia.random<string & tags.Format<"email">>();
  const ownerPassword: string = RandomGenerator.alphaNumeric(16);
  const owner: ICommunityPlatformOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    {
      body: {
        email: ownerEmail,
        password: ownerPassword,
      } satisfies ICommunityPlatformOwner.IJoin,
    },
  );
  typia.assert(owner);
  // Step 2: Create a community using the owner's authenticated connection
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_owner_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Register two moderators - one regular, one system admin
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  typia.assert(moderator);
  const adminModeratorConnection: api.IConnection = { host: connection.host };
  const adminModeratorEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const adminModeratorPassword: string = RandomGenerator.alphaNumeric(16);
  const adminModerator: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(adminModeratorConnection, {
      body: {
        email: adminModeratorEmail,
        password: adminModeratorPassword,
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  typia.assert(adminModerator);
  // Step 4: Use the system admin moderator's authenticated connection to retrieve the moderator profile
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as the admin moderator (not the owner) who has system-wide privileges
  await authorize_moderator_login(adminConnection, {
    body: {
      email: adminModeratorEmail,
      password: adminModeratorPassword,
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  // Retrieve moderator profile using admin's connection and moderatorId
  const retrievedModeratorProfile: ICommunityPlatformModerator =
    await api.functional.communityPlatform.moderator.moderators.at(
      adminConnection,
      { moderatorId: moderator.id },
    );
  typia.assert(retrievedModeratorProfile);
  // Step 5: Validation: Check that retrieved profile contains expected user and community information
  // For user: ICommunityPlatformMember.ISummary is an empty object {} so we can't validate id or any other property
  // But we can validate that the retrieved.user object exists and is not null/undefined
  TestValidator.predicate(
    "retrieved user is present",
    retrievedModeratorProfile.user !== null &&
      retrievedModeratorProfile.user !== undefined,
  );
  // For community: ICommunityPlatformCommunity.ISummary has 'name' property, which corresponds to community_code in the base type
  // The community object we created has community_code property, which should match the name in the summary type
  TestValidator.equals(
    "retrieved community name matches",
    retrievedModeratorProfile.community.name,
    community.community_code,
  );
}
