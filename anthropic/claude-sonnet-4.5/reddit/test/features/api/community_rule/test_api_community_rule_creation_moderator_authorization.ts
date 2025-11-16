import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test that community rule creation requires proper moderator authentication
 * and authorization.
 *
 * This test verifies that:
 *
 * 1. Authenticated moderators can successfully create rules for their communities
 * 2. Unauthenticated requests are rejected
 * 3. Rules are correctly associated with the specified community
 * 4. The community_id matches the community specified in the path parameter
 *
 * Test Flow:
 *
 * 1. Register a moderator account
 * 2. Create a community owned by this moderator
 * 3. Create a rule as authenticated moderator (should succeed)
 * 4. Attempt to create a rule without authentication (should fail)
 * 5. Validate rule properties and community association
 */
export async function test_api_community_rule_creation_moderator_authorization(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community owned by this moderator
  const communityName = RandomGenerator.alphabets(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create a rule as authenticated moderator (should succeed)
  const ruleTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 6,
  });
  const ruleDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const ruleNumber = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();

  const createdRule: IRedditCommunityCommunityRule =
    await api.functional.redditCommunity.moderator.communities.rules.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: ruleTitle,
          description: ruleDescription,
          rule_number: ruleNumber,
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(createdRule);

  // Validate created rule properties
  TestValidator.equals("rule title matches", createdRule.title, ruleTitle);
  TestValidator.equals(
    "rule description matches",
    createdRule.description,
    ruleDescription,
  );
  TestValidator.equals(
    "rule number matches",
    createdRule.rule_number,
    ruleNumber,
  );
  TestValidator.equals(
    "rule community_id matches community id",
    createdRule.community_id,
    community.id,
  );

  // Step 4: Test unauthenticated access (should fail)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated rule creation should fail",
    async () => {
      await api.functional.redditCommunity.moderator.communities.rules.create(
        unauthConnection,
        {
          communityName: community.name,
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            rule_number: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          } satisfies IRedditCommunityCommunityRule.ICreate,
        },
      );
    },
  );
}
