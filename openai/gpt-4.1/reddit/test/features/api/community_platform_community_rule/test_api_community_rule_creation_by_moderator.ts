import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test the successful creation of a community rule by a moderator and enforce
 * permission logic.
 *
 * 1. Register and authenticate as a platform member.
 * 2. Create a new community as that member.
 * 3. Register and authenticate as a moderator for this community.
 * 4. As the moderator, create a new rule document for the community.
 * 5. Verify rule creation fields and associations.
 * 6. Confirm that non-moderators cannot create rules for this community.
 */
export async function test_api_community_rule_creation_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberAuthorized = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAuthorized);

  // 2. Create community as the member
  const communityName = RandomGenerator.alphaNumeric(10);
  const communitySlug = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityCreateBody = {
    name: communityName,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 10,
    }),
    slug: communitySlug,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community creator member id matches",
    community.creator_member_id,
    memberAuthorized.id,
  );

  // 3. Register moderator for the new community using the same email
  const moderatorPassword = memberPassword; // must use the same email/password
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: memberEmail,
      password: moderatorPassword,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator community id matches",
    moderator.community_id,
    community.id,
  );

  // 4. Moderator creates a rule document for the community
  const now = new Date();
  const ruleCreateBody = {
    body: `# Community Rules\n\nBe respectful. No spam.`,
    version: 1 as number & tags.Type<"int32">,
    published_at: now.toISOString(),
  } satisfies ICommunityPlatformCommunityRule.ICreate;
  const rule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: ruleCreateBody,
      },
    );
  typia.assert(rule);
  TestValidator.equals("rule community id", rule.community_id, community.id);
  TestValidator.equals("rule version", rule.version, 1);
  TestValidator.equals("rule body matches", rule.body, ruleCreateBody.body);

  // 5. Attempt to create additional rules without moderator permissions (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-moderator cannot create rule", async () => {
    await api.functional.communityPlatform.moderator.communities.rules.create(
      unauthConn,
      {
        communityId: community.id,
        body: ruleCreateBody,
      },
    );
  });
}
