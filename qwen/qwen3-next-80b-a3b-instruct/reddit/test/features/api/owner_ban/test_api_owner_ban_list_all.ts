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
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_owner_ban_list_all(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as owner to access moderation bans
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformOwner.IJoin,
  });
  // Step 2: Call the ban list endpoint with default pagination (no filters)
  const bansPage: IPageICommunityPlatformBan =
    await api.functional.communityPlatform.owner.moderation.bans.index(
      ownerConnection,
      {
        body: {},
      },
    );
  // Step 3: Validate response structure and content
  typia.assert(bansPage);
  // Validate pagination fields
  TestValidator.equals(
    "pagination.current should be 1",
    bansPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should be 20 by default",
    bansPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination.records should be >= 0",
    bansPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be >= 0",
    bansPage.pagination.pages >= 0,
  );
  // Validate data array
  TestValidator.equals(
    "data should be an array",
    Array.isArray(bansPage.data),
    true,
  );
  // Validate each ban record has all required properties according to ISummary definitions
  bansPage.data.forEach((ban) => {
    // Basic ban record fields
    TestValidator.equals(
      "ban has id property",
      typeof ban.id === "string" && ban.id.length > 0,
      true,
    );
    // Ban reason is optional - when present, must be between 10-500 characters
    if (ban.reason !== null) {
      TestValidator.equals(
        "ban reason is string",
        typeof ban.reason === "string",
        true,
      );
      TestValidator.predicate(
        "ban reason has at least 10 characters",
        ban.reason.length >= 10,
      );
      TestValidator.predicate(
        "ban reason has at most 500 characters",
        ban.reason.length <= 500,
      );
    }
    // Timestamp validation
    TestValidator.equals(
      "ban has created_at property",
      typeof ban.created_at === "string" && ban.created_at.length > 0,
      true,
    );
    // User info (ISummary type) - Use typia.assert to validate structure instead of property-by-property
    typia.assert<unknown>(ban.bannedUser);
    // Community info (ISummary type)
    typia.assert<unknown>(ban.community);
    // Moderator info (ISummary type)
    typia.assert<unknown>(ban.moderator);
    // Final validation of structure for each object
    TestValidator.equals(
      "moderator has username property",
      typeof ban.moderator.username === "string" &&
        ban.moderator.username.length > 0,
      true,
    );
  });
}