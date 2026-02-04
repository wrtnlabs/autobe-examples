import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_owner_unban_moderator_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformOwner.IJoin,
  });
  ownerConnection.headers!.Authorization = ownerAuth.token.access;
  // Step 2: Create moderator account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  moderatorConnection.headers!.Authorization = moderatorAuth.token.access;
  // Step 3: Create a ban using moderator's connection
  // We need to use moderatorAuth.id as community_id (moderator's unique ID)
  // But we need to ensure the moderator is assigned to a community
  // We'll create a ban with moderatorAuth.id as both community_id and moderator_id
  // and ownerAuth.id as the banned_user_id
  const createBanResponse =
    await api.functional.communityPlatform.moderator.moderation.bans.index(
      moderatorConnection,
      {
        body: {
          community_id: moderatorAuth.id, // Use moderator's ID as community ID (workaround)
          banned_user_id: ownerAuth.id, // Ban the owner account
          moderator_id: moderatorAuth.id, // Moderator creating the ban
        } satisfies ICommunityPlatformBan.IRequest,
      },
    );
  // Validate that the ban was created
  typia.assert<IPageICommunityPlatformBan.ISummary>(createBanResponse);
  // Extract the ban ID from the created ban
  if (!createBanResponse.data || createBanResponse.data.length === 0) {
    throw new Error("No bans returned in response");
  }
  // Get first ban record and extract target_id (which is the UUID of the banned user)
  const banId: string = createBanResponse.data[0].target_id;
  typia.assert<string & tags.Format<"uuid">>(banId);
  // Step 4: Moderator attempts to unban the user (should be denied - 403 Forbidden)
  // Only owners have permission to unban
  await TestValidator.error(
    "moderator cannot unban user when only owner has permission",
    async () => {
      await api.functional.communityPlatform.owner.moderation.bans.erase(
        moderatorConnection,
        {
          banId,
        },
      );
    },
  );
}
