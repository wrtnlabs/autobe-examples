import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

export async function test_api_community_rule_creation_timestamp_generation(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "TestPassword123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community to contain the test rule
  const communityName = RandomGenerator.alphaNumeric(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Capture system time before creating the rule
  const beforeTimestamp = new Date();

  // Step 4: Create a community rule via the API
  const rule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rule_number: 1,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  // Step 5: Capture system time after rule creation
  const afterTimestamp = new Date();

  // Step 6: Validate that created_at and updated_at timestamps exist and are in valid ISO 8601 format
  TestValidator.predicate(
    "created_at timestamp exists",
    rule.created_at !== null && rule.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    rule.updated_at !== null && rule.updated_at !== undefined,
  );

  // Step 7: Verify that both timestamps fall within the expected time range
  const createdAtDate = new Date(rule.created_at);
  const updatedAtDate = new Date(rule.updated_at);

  TestValidator.predicate(
    "created_at is after beforeTimestamp",
    createdAtDate.getTime() >= beforeTimestamp.getTime(),
  );
  TestValidator.predicate(
    "created_at is before afterTimestamp",
    createdAtDate.getTime() <= afterTimestamp.getTime(),
  );
  TestValidator.predicate(
    "updated_at is after beforeTimestamp",
    updatedAtDate.getTime() >= beforeTimestamp.getTime(),
  );
  TestValidator.predicate(
    "updated_at is before afterTimestamp",
    updatedAtDate.getTime() <= afterTimestamp.getTime(),
  );

  // Step 8: Confirm that created_at and updated_at are identical or extremely close
  TestValidator.equals(
    "created_at and updated_at are identical for new rule",
    rule.created_at,
    rule.updated_at,
  );
}
