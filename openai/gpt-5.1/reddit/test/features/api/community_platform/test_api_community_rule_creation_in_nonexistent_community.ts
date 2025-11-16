import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";

/**
 * Validate that creating a community rule for a non-existent community fails.
 *
 * Business intent:
 *
 * - A community rule must always be associated with a real, resolvable community.
 * - If a moderator attempts to create a rule against a communityIdentifier that
 *   does not map to any existing community, the operation must fail and must
 *   not return a rule object.
 *
 * High-level workflow:
 *
 * 1. Register and authenticate a community moderator using the public join API.
 * 2. Construct a synthetic communityIdentifier that is virtually guaranteed not to
 *    correspond to any existing community.
 * 3. Build a fully valid ICommunityPlatformCommunityRule.ICreate payload.
 * 4. Call the rule creation endpoint for the non-existent community inside
 *    TestValidator.error and assert that it throws an error.
 *
 * Notes:
 *
 * - We do not attempt to verify persistence or list rules because no such APIs
 *   are exposed in this context; instead we validate that the creation call
 *   does not succeed and no rule DTO is produced.
 */
export async function test_api_community_rule_creation_in_nonexistent_community(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a community moderator.
  const joinBody = {
    username: RandomGenerator.alphabets(16),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(moderator);

  // 2. Prepare a non-existent community identifier (high-entropy slug).
  const communityIdentifier: string = `definitely-nonexistent-community-${RandomGenerator.alphaNumeric(24)}`;

  // 3. Build a valid community rule creation payload.
  const ruleCreateBody = {
    label: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
    rule_category_code: null,
  } satisfies ICommunityPlatformCommunityRule.ICreate;

  // 4. Attempt to create a rule under the non-existent community and
  //    assert that the call fails with some error.
  await TestValidator.error(
    "creating a rule for a non-existent community must fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.rules.create(
        connection,
        {
          communityIdentifier,
          body: ruleCreateBody,
        },
      );
    },
  );
}
