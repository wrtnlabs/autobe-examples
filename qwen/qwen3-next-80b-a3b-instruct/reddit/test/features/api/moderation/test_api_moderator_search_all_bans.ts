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
export async function test_api_moderator_search_all_bans(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 2: Use the search endpoint to retrieve all bans
  const response =
    await api.functional.communityPlatform.moderator.moderation.bans.index(
      moderatorConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // Step 3: Validate pagination and data structure
  TestValidator.equals(
    "pagination should include current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination should include limit",
    response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination should have records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have pages",
    response.pagination.pages >= 0,
  );
  // Step 4: Validate that response contains ban records with correct context
  // Note: There might be zero bans in the system, so we don't enforce > 0
  // Step 5: Validate that each ban record has required structure with moderator and community context
  for (const ban of response.data) {
    // Validate target_type is one of the allowed values
    TestValidator.equals(
      "ban should have target_type",
      ban.target_type,
      "member" as const,
    );
    TestValidator.equals(
      "ban should have target_type",
      ban.target_type,
      "post" as const,
    );
    TestValidator.equals(
      "ban should have target_type",
      ban.target_type,
      "comment" as const,
    );
    // Validate target_id is a valid UUID
    TestValidator.predicate(
      "ban target_id should be valid UUID",
      typia.is<string & tags.Format<"uuid">>(ban.target_id),
    );
    // Validate moderator context (using ICommunityPlatformModerator.ISummary)
    // ICommunityPlatformModerator.ISummary has: id: string & Format<"uuid">, username: string & MinLength<1>
    TestValidator.equals(
      "ban moderator object should exist",
      typeof ban.moderator,
      "object",
    );
    TestValidator.equals(
      "ban moderator should have id",
      typeof ban.moderator.id,
      "string",
    );
    TestValidator.predicate(
      "ban moderator id should be valid UUID",
      typia.is<string & tags.Format<"uuid">>(ban.moderator.id),
    );
    TestValidator.equals(
      "ban moderator should have username",
      typeof ban.moderator.username,
      "string",
    );
    TestValidator.predicate(
      "ban moderator username should have content",
      ban.moderator.username.length > 0,
    );
    // Validate community context (using ICommunityPlatformCommunity.ISummary)
    // ICommunityPlatformCommunity.ISummary has: name: string & MinLength<1>
    TestValidator.equals(
      "ban community object should exist",
      typeof ban.community,
      "object",
    );
    TestValidator.equals(
      "ban community should have name",
      typeof ban.community.name,
      "string",
    );
    TestValidator.predicate(
      "ban community name should have content",
      ban.community.name.length > 0,
    );
  }
}
