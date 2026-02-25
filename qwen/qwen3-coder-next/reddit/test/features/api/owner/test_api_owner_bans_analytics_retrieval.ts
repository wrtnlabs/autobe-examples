import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_bans_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneOwner.IJoin,
  });
  // Execute: Retrieve bans analytics
  const bansAnalytics =
    await api.functional.redditClone.owner.analytics.bans.getBansAnalytics(
      ownerConnection,
    );
  // Validate: Verify response structure matches IRedditCloneCommunityBan
  typia.assert(bansAnalytics);
  // Verify essential analytics properties
  TestValidator.predicate("has ban ID", typeof bansAnalytics.id === "string");
  TestValidator.predicate(
    "has community info",
    bansAnalytics.community !== null,
  );
  TestValidator.predicate("has user info", bansAnalytics.user !== null);
  TestValidator.predicate(
    "has moderator info",
    bansAnalytics.moderator !== null,
  );
  TestValidator.predicate(
    "has ban reason",
    typeof bansAnalytics.banReason === "string",
  );
  TestValidator.predicate(
    "has ban start date",
    typeof bansAnalytics.banStartDate === "string",
  );
  TestValidator.predicate(
    "has appeal status",
    typeof bansAnalytics.appealStatus === "string",
  );
  TestValidator.predicate(
    "has created at",
    typeof bansAnalytics.createdAt === "string",
  );
  TestValidator.predicate(
    "has updated at",
    typeof bansAnalytics.updatedAt === "string",
  );
  // Verify community summary structure
  if (bansAnalytics.community) {
    TestValidator.equals(
      "community has ID",
      typeof bansAnalytics.community.id,
      "string",
    );
    TestValidator.equals(
      "community has name",
      typeof bansAnalytics.community.name,
      "string",
    );
    TestValidator.predicate(
      "community has subscriber count",
      typeof bansAnalytics.community.subscriberCount === "number",
    );
  }
  // Verify user summary structure
  if (bansAnalytics.user) {
    TestValidator.equals("user has ID", typeof bansAnalytics.user.id, "string");
    TestValidator.equals(
      "user has username",
      typeof bansAnalytics.user.username,
      "string",
    );
  }
  // Verify moderator summary structure
  if (bansAnalytics.moderator) {
    TestValidator.equals(
      "moderator has ID",
      typeof bansAnalytics.moderator.id,
      "string",
    );
    TestValidator.equals(
      "moderator has username",
      typeof bansAnalytics.moderator.username,
      "string",
    );
    TestValidator.predicate(
      "moderator has permissions",
      typeof bansAnalytics.moderator.permissions === "number",
    );
  }
}
