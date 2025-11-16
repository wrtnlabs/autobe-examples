import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_community_ban_retrieval_with_appeal_information(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for managing bans and appeals
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: "ValidPassword123!",
        href: "http://localhost:3000/auth/moderator/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: "ValidPassword123!",
        href: "http://localhost:3000/auth/member/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create community for ban context
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(15).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ValidPassword123!",
      href: "http://localhost:3000/auth/moderator/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 5: Create a temporary ban
  const temporaryBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member.id,
          ban_type: "temporary",
          reason: "Violation of community rules - Test temporary ban",
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(temporaryBan);

  // Step 6: Retrieve temporary ban and verify appeal fields are present and null
  let retrievedBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.at(
      connection,
      {
        communityId: community.id,
        banId: temporaryBan.id,
      },
    );
  typia.assert(retrievedBan);

  TestValidator.equals(
    "newly created ban has no appeal submitted yet",
    retrievedBan.appeal_submitted_at,
    null,
  );
  TestValidator.equals(
    "newly created ban has no appeal resolved",
    retrievedBan.appeal_resolved_at,
    null,
  );
  TestValidator.equals(
    "newly created ban has no appeal approval status",
    retrievedBan.appeal_approved,
    null,
  );

  // Step 7: Verify ban core information is present and correct
  TestValidator.equals(
    "retrieved ban ID matches created ban",
    retrievedBan.id,
    temporaryBan.id,
  );
  TestValidator.equals(
    "community reference in ban matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "banned member reference matches",
    retrievedBan.member.id,
    member.id,
  );
  TestValidator.equals(
    "ban type matches temporary",
    retrievedBan.ban_type,
    "temporary",
  );
  TestValidator.predicate(
    "ban reason is documented",
    retrievedBan.reason.length > 0,
  );
  TestValidator.predicate(
    "moderator information is recorded",
    retrievedBan.moderator.id.length > 0 &&
      retrievedBan.moderator.username.length > 0,
  );
  TestValidator.predicate(
    "ban created timestamp is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedBan.created_at),
  );
  TestValidator.predicate(
    "ban expiration is set for temporary ban",
    retrievedBan.expires_at !== null && retrievedBan.expires_at !== undefined,
  );

  // Step 8: Create permanent ban to test different ban type
  const permanentBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member.id,
          ban_type: "permanent",
          reason: "Severe violation - Test permanent ban appeal structure",
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(permanentBan);

  // Step 9: Retrieve permanent ban and verify appeal field structure
  retrievedBan =
    await api.functional.communityPlatform.moderator.communities.bans.at(
      connection,
      {
        communityId: community.id,
        banId: permanentBan.id,
      },
    );
  typia.assert(retrievedBan);

  TestValidator.equals(
    "permanent ban type is correct",
    retrievedBan.ban_type,
    "permanent",
  );
  TestValidator.equals(
    "permanent ban has no expiration",
    retrievedBan.expires_at,
    null,
  );
  TestValidator.equals(
    "permanent ban appeal_submitted_at is null initially",
    retrievedBan.appeal_submitted_at,
    null,
  );
  TestValidator.equals(
    "permanent ban appeal_resolved_at is null initially",
    retrievedBan.appeal_resolved_at,
    null,
  );
  TestValidator.equals(
    "permanent ban appeal_approved is null initially",
    retrievedBan.appeal_approved,
    null,
  );

  // Step 10: Verify complete appeal information structure is visible in API response
  TestValidator.predicate(
    "retrieved ban has all required appeal fields in response",
    retrievedBan.hasOwnProperty("appeal_submitted_at") &&
      retrievedBan.hasOwnProperty("appeal_resolved_at") &&
      retrievedBan.hasOwnProperty("appeal_approved"),
  );

  // Step 11: Create another temporary ban to verify appeal field consistency
  const anotherBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member.id,
          ban_type: "temporary",
          reason: "Spam detection - Appeal workflow validation",
          expires_at: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(anotherBan);

  // Step 12: Verify ban retrieval returns consistent appeal information structure
  retrievedBan =
    await api.functional.communityPlatform.moderator.communities.bans.at(
      connection,
      {
        communityId: community.id,
        banId: anotherBan.id,
      },
    );
  typia.assert(retrievedBan);

  TestValidator.predicate(
    "ban retrieval consistently includes appeal_submitted_at field",
    retrievedBan.appeal_submitted_at === null ||
      typeof retrievedBan.appeal_submitted_at === "string",
  );
  TestValidator.predicate(
    "ban retrieval consistently includes appeal_resolved_at field",
    retrievedBan.appeal_resolved_at === null ||
      typeof retrievedBan.appeal_resolved_at === "string",
  );
  TestValidator.predicate(
    "ban retrieval consistently includes appeal_approved field",
    retrievedBan.appeal_approved === null ||
      typeof retrievedBan.appeal_approved === "boolean",
  );
}
