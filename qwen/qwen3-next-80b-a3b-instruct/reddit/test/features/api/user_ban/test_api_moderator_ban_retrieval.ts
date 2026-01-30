import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserBan";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsUserBan";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_ban_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@example.com",
        password_hash: RandomGenerator.alphaNumeric(32),
      } satisfies ICommunityBbsModerator.IJoin,
    });
  typia.assert(moderator);
  // Retrieve paginated ban records
  const result: IPageICommunityBbsUserBan =
    await api.functional.communityBbs.moderator.users.bans.get(
      moderatorConnection,
    );
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is at least 1",
    result.pagination.current,
    result.pagination.current,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate data contains expected structure
  TestValidator.predicate(
    "data exists and contains records",
    result.data.length > 0,
  );
  result.data.forEach((ban) => {
    typia.assert(ban.user);
    TestValidator.equals(
      "user has valid UUID id",
      typeof ban.user.id,
      "string",
    );
    TestValidator.equals("user has name", typeof ban.user.name, "string");
    TestValidator.predicate(
      "user reputation is non-negative",
      ban.user.reputation >= 0,
    );
    typia.assert(ban.bannedBy);
    TestValidator.equals(
      "bannedBy has valid UUID id",
      typeof ban.bannedBy.id,
      "string",
    );
    TestValidator.equals(
      "bannedBy has name",
      typeof ban.bannedBy.name,
      "string",
    );
    TestValidator.equals(
      "bannedBy has role 'admin'",
      ban.bannedBy.role,
      "admin",
    );
    TestValidator.predicate("reason is non-empty", ban.reason.length > 0);
    TestValidator.equals(
      "banned_by_type is 'moderator'",
      ban.banned_by_type,
      "moderator",
    );
    // typia.assert already validates created_at format (date-time)
  });
}
