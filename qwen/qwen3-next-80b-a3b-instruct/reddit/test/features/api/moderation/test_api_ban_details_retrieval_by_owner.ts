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
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_ban_details_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection and authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformOwner.IJoin,
  });
  typia.assert(owner);
  // Generate a random banId
  const banId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve ban details using owner's authenticated connection
  const ban: ICommunityPlatformBan =
    await api.functional.communityPlatform.owner.moderation.bans.at(
      ownerConnection,
      {
        banId,
      },
    );
  typia.assert(ban);
  // Validate essential properties exist and have correct structure
  TestValidator.equals("ban ID matches", ban.id, banId);
  TestValidator.predicate(
    "banned user is summary object",
    () => typeof ban.bannedUser === "object" && ban.bannedUser !== null,
  );
  TestValidator.predicate(
    "community is summary object",
    () => typeof ban.community === "object" && ban.community !== null,
  );
  TestValidator.predicate(
    "moderator is summary object",
    () => typeof ban.moderator === "object" && ban.moderator !== null,
  );
  // Additional structure validation - must match DTO
  TestValidator.predicate("bannedUser has id", () => "id" in ban.bannedUser);
  TestValidator.predicate("community has name", () => "name" in ban.community);
  TestValidator.predicate(
    "moderator has id and username",
    () => "id" in ban.moderator && "username" in ban.moderator,
  );
}
