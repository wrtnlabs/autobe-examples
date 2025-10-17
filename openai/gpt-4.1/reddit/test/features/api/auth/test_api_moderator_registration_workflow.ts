import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validate moderator registration workflow.
 *
 * 1. Register a new platform member (unique email). Assert authorization returned.
 * 2. Create a community as that member. Assert returned community properties.
 * 3. Register the moderator with the member's email/password and community ID.
 *    Assert returned moderator is linked to the same member and community.
 * 4. Validate moderator token present and account status is 'active'.
 * 5. Attempt repeated moderator registration with the same email/community (should
 *    fail).
 * 6. Attempt moderator registration with a non-member email (should fail).
 */
export async function test_api_moderator_registration_workflow(
  connection: api.IConnection,
) {
  // 1. Register platform member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: { email, password } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  TestValidator.equals("member email matches input", member.email, email);

  // 2. Create community as member
  const communityReq = {
    name: RandomGenerator.alphaNumeric(8).toLowerCase(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    slug: RandomGenerator.alphaNumeric(12).toLowerCase(),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityReq },
    );
  typia.assert(community);
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityReq.name,
  );
  TestValidator.equals(
    "community title matches input",
    community.title,
    communityReq.title,
  );
  TestValidator.equals(
    "community slug matches input",
    community.slug,
    communityReq.slug,
  );
  TestValidator.equals(
    "community creator matches member",
    community.creator_member_id,
    member.id,
  );

  // 3. Register moderator with the same email and password for the created community
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email,
      password,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches member",
    moderator.email,
    email,
  );
  TestValidator.equals(
    "moderator member_id matches base member",
    moderator.member_id,
    member.id,
  );
  TestValidator.equals(
    "moderator community_id matches input",
    moderator.community_id,
    community.id,
  );
  TestValidator.equals(
    "moderator status is active",
    moderator.status,
    "active",
  );
  typia.assert(moderator.token);
  TestValidator.predicate(
    "moderator token is string",
    typeof moderator.token.access === "string",
  );

  // 4. Attempt to register the same moderator again (should error on uniqueness)
  await TestValidator.error(
    "duplicate moderator registration fails",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email,
          password,
          community_id: community.id,
        } satisfies ICommunityPlatformModerator.IJoin,
      });
    },
  );

  // 5. Attempt to register moderator with an email that is not a registered member (should fail on member precondition)
  await TestValidator.error(
    "moderator registration with non-member email fails",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(10),
          community_id: community.id,
        } satisfies ICommunityPlatformModerator.IJoin,
      });
    },
  );
}
