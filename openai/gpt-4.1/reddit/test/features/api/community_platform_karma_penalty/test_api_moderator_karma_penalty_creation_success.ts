import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaPenalty";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

/**
 * Validate that a moderator can assign a karma penalty to a subscribed member
 * within their managed community.
 *
 * 1. Create a new community as a member
 * 2. Subscribe a member to that community (so they become eligible for penalties)
 * 3. Register a moderator account for that community
 * 4. Authenticate as moderator
 * 5. As moderator, assign a karma penalty (deduction) for the subscribed member
 * 6. Assert the penalty record's correctness and business rule coverage
 */
export async function test_api_moderator_karma_penalty_creation_success(
  connection: api.IConnection,
) {
  // 1. Create a new community as a member
  const communityName = RandomGenerator.alphaNumeric(12).toLowerCase();
  const communitySlug = RandomGenerator.alphaNumeric(12).toLowerCase();
  const createCommunityBody = {
    name: communityName,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    // minimum 10 chars for description
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    slug: communitySlug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: createCommunityBody },
    );
  typia.assert(community);
  TestValidator.equals("community name", community.name, communityName);
  TestValidator.equals("community slug", community.slug, communitySlug);

  // 2. Subscribe a member to the just-created community
  // For testing, a fresh subscription call yields a unique member context
  const subscription: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscribed community id",
    subscription.community_id,
    community.id,
  );

  // 3. Register and authenticate as a moderator for that community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorJoinBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    community_id: community.id,
  } satisfies ICommunityPlatformModerator.IJoin;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator community",
    moderator.community_id,
    community.id,
  );
  TestValidator.equals("moderator email", moderator.email, moderatorEmail);

  // 4. As authenticated moderator (already handled by join), assign a karma penalty (deduction type) to the subscribed member
  const penaltyBody = {
    community_platform_member_id: subscription.member_id,
    community_platform_community_id: community.id,
    penalty_type: "deduction",
    penalty_value: -5,
    penalty_reason: RandomGenerator.paragraph({ sentences: 8 }),
    penalty_status: "active",
    applied_at: new Date().toISOString(),
    expires_at: null,
  } satisfies ICommunityPlatformKarmaPenalty.ICreate;

  const penalty: ICommunityPlatformKarmaPenalty =
    await api.functional.communityPlatform.moderator.karmaPenalties.create(
      connection,
      {
        body: penaltyBody,
      },
    );
  typia.assert(penalty);
  TestValidator.equals(
    "penalty member id",
    penalty.community_platform_member_id,
    subscription.member_id,
  );
  TestValidator.equals(
    "penalty community id",
    penalty.community_platform_community_id,
    community.id,
  );
  TestValidator.equals("penalty type", penalty.penalty_type, "deduction");
  TestValidator.equals("penalty value", penalty.penalty_value, -5);
  TestValidator.equals("penalty status", penalty.penalty_status, "active");
  TestValidator.equals(
    "penalty reason",
    penalty.penalty_reason,
    penaltyBody.penalty_reason,
  );
  TestValidator.equals(
    "penalty applied at",
    penalty.applied_at,
    penaltyBody.applied_at,
  );
  TestValidator.equals(
    "penalty expires at",
    penalty.expires_at,
    penaltyBody.expires_at,
  );
}
