import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_banned_user_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare a moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinBody: Partial<ICommunityPlatformModerator.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}`,
  };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    { body: moderatorJoinBody },
  );
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuthorized.token.access}`,
  };
  // 2. Since no utility functions exist for creating banned user records,
  //    we generate a random valid UUID to attempt retrieval,
  //    but as per scenario, this test assumes the record exists in DB.
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the banned user record by the authenticated moderator
  const bannedUser =
    await api.functional.communityPlatform.moderator.banned_users.at(
      moderatorConnection,
      { id: bannedUserId },
    );
  typia.assert(bannedUser);
  // 4. Validate the key properties to confirm correct response
  // Validate banned user ID format
  TestValidator.predicate(
    "banned user id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      bannedUser.id,
    ),
  );
  // Validate bannedAt timestamp
  TestValidator.predicate(
    "banned at timestamp is valid",
    Date.parse(bannedUser.bannedAt) > 0,
  );
  // Validate reason non-empty
  TestValidator.predicate(
    "reason is non-empty",
    typeof bannedUser.reason === "string" && bannedUser.reason.length > 0,
  );
  // Validate unbannedAt nullable datetime
  TestValidator.equals(
    "unbannedAt is either null or valid date",
    bannedUser.unbannedAt === null ||
      !isNaN(Date.parse(bannedUser.unbannedAt ?? "")),
    true,
  );
  // Validate nested user summary
  typia.assert(bannedUser.user);
  TestValidator.predicate(
    "user id UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      bannedUser.user.id,
    ),
  );
  // Validate nested community summary
  typia.assert(bannedUser.community);
  TestValidator.predicate(
    "community id UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      bannedUser.community.id,
    ),
  );
  // Validate audit timestamps
  TestValidator.predicate(
    "createdAt is valid date",
    Date.parse(bannedUser.createdAt) > 0,
  );
  TestValidator.predicate(
    "updatedAt is valid date",
    Date.parse(bannedUser.updatedAt) > 0,
  );
  TestValidator.equals(
    "deletedAt is either null or valid date",
    bannedUser.deletedAt === null ||
      !isNaN(Date.parse(bannedUser.deletedAt ?? "")),
    true,
  );
}
