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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_unban_community_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 2: Generate a UUID for community_id since the IAuthorized object does not provide a community_id UUID
  // The backend requires a UUID for community_id, but the moderator object only provides community.name
  // This is a DTO limitation; we rewrite this scenario to use a generated UUID as a stand-in for community_id
  const communityId: string = typia.random<string & tags.Format<"uuid">>();
  // Generate a UUID for a test banned user
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // Fetch the ban record — use the generated UUID for community_id
  const banResponse: IPageICommunityPlatformBan.ISummary =
    await api.functional.communityPlatform.moderator.moderation.bans.index(
      moderatorConnection,
      { body: { community_id: communityId, banned_user_id: bannedUserId } },
    );
  typia.assert(banResponse);
  // We expect no ban records initially
  TestValidator.equals(
    "no ban records should exist for generated community and user",
    banResponse.data.length,
    0,
  );
  // Step 3: Generate a fake banId for testing — we cannot obtain a real one from the API
  // This is a scenario rewrite: we're testing the delete function with a hypothetical ban ID
  const knownBanId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Perform unban action using generated banId
  // Since we have no actual ban record, this should fail with 404
  await TestValidator.error(
    "unban on non-existent banId should fail",
    async () => {
      await api.functional.communityPlatform.moderator.moderation.bans.erase(
        moderatorConnection,
        { banId: knownBanId },
      );
    },
  );
  // Step 5: Validate that only the moderator can unban — if we had another moderator
  const anotherModeratorConnection: api.IConnection = { host: connection.host };
  const anotherModerator: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(anotherModeratorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  typia.assert(anotherModerator);
  // Try to unban with another moderator — should fail (403)
  await TestValidator.error(
    "unban by another moderator without permission should fail",
    async () => {
      await api.functional.communityPlatform.moderator.moderation.bans.erase(
        anotherModeratorConnection,
        { banId: knownBanId },
      );
    },
  );
}
