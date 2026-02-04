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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_moderator_profile_retrieval_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a regular member account with no moderator privileges
  const member1Connection: api.IConnection = { host: connection.host };
  const member1: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(member1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(member1);
  // Step 2: Create a community owner account and assign them as owner of a new community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: ICommunityPlatformOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(owner);
  // Create community assigned to owner
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_owner_communities_create(
      ownerConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // Step 3: Register a moderator account and assign them to the newly created community
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(moderator);
  // Step 4: Create an additional regular member account to test unauthorized access
  const member2Connection: api.IConnection = { host: connection.host };
  const member2: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(member2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(member2);
  // Step 5: Attempt to retrieve moderator profile details using the unauthorized member's credentials
  // This should fail with 403 Forbidden
  await TestValidator.error(
    "non-owner member should receive 403 Forbidden when accessing moderator profile",
    async () => {
      await api.functional.communityPlatform.moderator.moderators.at(
        member2Connection,
        {
          moderatorId: moderator.id,
        },
      );
    },
  );
  // Step 6: Verify the API responds with 403 Forbidden status with appropriate error message
  // (The TestValidator.error will automatically verify the HTTP status code is 403)
}
