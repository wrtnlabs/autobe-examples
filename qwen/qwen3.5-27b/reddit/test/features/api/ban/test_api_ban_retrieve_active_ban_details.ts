import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test that a community moderator can successfully retrieve complete details of an active ban record.
 *
 * Validates the ban retrieval workflow by authenticating as a moderator and calling the GET endpoint to retrieve ban details. Ensures that the response contains all required fields including ban metadata (ID, reason, expiration, timestamps) and complete nested entity objects (community, banned member, banning moderator).
 *
 * Special attention is given to verifying that the response structure is complete and that all nested objects are properly populated for moderator audit purposes. The test uses randomly generated UUIDs to simulate retrieval of an existing active ban.
 *
 * 1. Authenticate as a moderator using join endpoint.
 * 2. Generate random UUIDs for community ID and ban ID parameters.
 * 3. Retrieve the ban details using the GET endpoint with community ID and ban ID.
 * 4. Validate that the response contains all required fields and nested objects.
 */
export async function test_api_ban_retrieve_active_ban_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 2. Generate random UUIDs for community ID and ban ID
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const banId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the ban details
  const retrievedBan =
    await api.functional.redditClone.moderator.communities.bans.at(
      moderatorConnection,
      {
        communityId,
        banId,
      },
    );
  typia.assert(retrievedBan);
  // 4. Validate response structure
  TestValidator.equals("ban ID matches request", retrievedBan.id, banId);
  TestValidator.predicate("has ban reason", retrievedBan.banReason !== "");
  TestValidator.predicate(
    "has creation timestamp",
    retrievedBan.createdAt !== undefined,
  );
  TestValidator.predicate(
    "has update timestamp",
    retrievedBan.updatedAt !== undefined,
  );
  // Validate expiresAt (can be null for permanent bans)
  if (retrievedBan.expiresAt !== null) {
    TestValidator.predicate(
      "expiration timestamp is valid",
      retrievedBan.expiresAt !== undefined,
    );
  } else {
    TestValidator.equals(
      "permanent ban has null expiration",
      retrievedBan.expiresAt,
      null,
    );
  }
  // Validate deletedAt (should be null for active bans)
  TestValidator.equals(
    "active ban has null deleted_at",
    retrievedBan.deletedAt,
    null,
  );
  // Validate community nested object
  TestValidator.equals(
    "community ID matches request",
    retrievedBan.community.id,
    communityId,
  );
  TestValidator.predicate(
    "community has name",
    retrievedBan.community.name !== "",
  );
  TestValidator.predicate(
    "community has description",
    retrievedBan.community.description !== "",
  );
  TestValidator.predicate(
    "community has owner",
    retrievedBan.community.owner !== undefined,
  );
  TestValidator.predicate(
    "community owner has display name",
    retrievedBan.community.owner.display_name !== "",
  );
  TestValidator.predicate(
    "community has subscriber count",
    typeof retrievedBan.community.subscriber_count === "number",
  );
  TestValidator.predicate(
    "community has creation timestamp",
    retrievedBan.community.created_at !== undefined,
  );
  // Validate banned member nested object
  TestValidator.predicate(
    "banned member has ID",
    retrievedBan.bannedMember.id !== "",
  );
  TestValidator.predicate(
    "banned member has email",
    retrievedBan.bannedMember.email !== "",
  );
  TestValidator.predicate(
    "banned member has username",
    retrievedBan.bannedMember.username !== "",
  );
  TestValidator.predicate(
    "banned member has creation timestamp",
    retrievedBan.bannedMember.created_at !== undefined,
  );
  TestValidator.predicate(
    "banned member has profile",
    retrievedBan.bannedMember.profile !== undefined,
  );
  TestValidator.predicate(
    "banned member profile has display name",
    retrievedBan.bannedMember.profile.display_name !== "",
  );
  TestValidator.predicate(
    "banned member profile has karma",
    typeof retrievedBan.bannedMember.profile.karma === "number",
  );
  // Validate banning moderator nested object
  TestValidator.predicate(
    "banning moderator has ID",
    retrievedBan.banningModerator.id !== "",
  );
  TestValidator.predicate(
    "banning moderator has email",
    retrievedBan.banningModerator.email !== "",
  );
  TestValidator.predicate(
    "banning moderator has creation timestamp",
    retrievedBan.banningModerator.created_at !== undefined,
  );
  TestValidator.predicate(
    "banning moderator has profile",
    retrievedBan.banningModerator.profile !== undefined,
  );
  TestValidator.predicate(
    "banning moderator profile has display name",
    retrievedBan.banningModerator.profile.display_name !== "",
  );
  TestValidator.predicate(
    "banning moderator profile has karma",
    typeof retrievedBan.banningModerator.profile.karma === "number",
  );
}
