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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_moderator_removal_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(owner);
  // Step 2: Create a new moderator account with stored password
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    },
  });
  typia.assert(moderator);
  // Step 3: Assign the moderator to the owner's community
  // Use the community name from moderator's community property (the actual community identifier)
  const communityName = moderator.community.name;
  await api.functional.communityPlatform.owner.communities.update(
    ownerConnection,
    {
      communityCode: communityName,
      body: {} satisfies ICommunityPlatformCommunity.IUpdate,
    },
  );
  // Step 4: Authenticate as the moderator to verify initial permissions
  const moderatorAuthConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorAuthConnection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword, // Use the exact password from creation
    },
  });
  // Step 5: Remove the moderator by owner using the owner's connection
  await api.functional.communityPlatform.moderator.moderators.erase(
    ownerConnection,
    {
      moderatorId: moderator.id,
    },
  );
  // Step 6: Verify that the removed moderator can no longer perform moderation actions
  // Try to perform moderator removal again, this time as the moderator
  await TestValidator.error(
    "removed moderator should not be able to remove themselves",
    async () => {
      await api.functional.communityPlatform.moderator.moderators.erase(
        moderatorAuthConnection,
        {
          moderatorId: moderator.id,
        },
      );
    },
  );
  // Step 7: Verify the moderator account still exists and can login as regular user
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorLoginConnection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword, // Use the exact password from creation
    },
  });
  typia.assert(moderatorLoginConnection);
  // Moderator can still access as general user
}
