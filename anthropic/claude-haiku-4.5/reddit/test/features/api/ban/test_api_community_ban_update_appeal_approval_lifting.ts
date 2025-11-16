import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_community_ban_update_appeal_approval_lifting(
  connection: api.IConnection,
) {
  // 1. Create member account (will be banned)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(10),
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // 2. Create moderator account
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modPassword = RandomGenerator.alphaNumeric(12);
  const modData = {
    email: modEmail,
    username: RandomGenerator.alphabets(10),
    password: modPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: modData,
  });
  typia.assert(moderator);

  // 3. Switch to member context for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 4. Create a community (as member)
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: "technology",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // 5. Create another member account to be banned
  const bannedMemberEmail = typia.random<string & tags.Format<"email">>();
  const bannedMemberPassword = RandomGenerator.alphaNumeric(12);
  const bannedMemberData = {
    email: bannedMemberEmail,
    username: RandomGenerator.alphabets(10),
    password: bannedMemberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const bannedMember = await api.functional.auth.member.join(connection, {
    body: bannedMemberData,
  });
  typia.assert(bannedMember);

  // 6. Switch to moderator context for ban operations
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: modEmail,
      password: modPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 7. Create a ban for the member
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: bannedMember.id,
          ban_type: "temporary" as const,
          reason: banReason,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // Verify initial ban state
  TestValidator.equals(
    "ban created with null appeal_approved",
    ban.appeal_approved,
    null,
  );
  TestValidator.equals(
    "appeal_submitted_at is null initially",
    ban.appeal_submitted_at,
    null,
  );
  TestValidator.equals(
    "appeal_resolved_at is null initially",
    ban.appeal_resolved_at,
    null,
  );

  // 8. Record appeal submission timestamp
  const appealSubmittedAt = new Date().toISOString();
  const banWithAppealSubmitted =
    await api.functional.communityPlatform.moderator.communities.bans.update(
      connection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          appeal_submitted_at: appealSubmittedAt,
        } satisfies ICommunityPlatformCommunityBan.IUpdate,
      },
    );
  typia.assert(banWithAppealSubmitted);

  // Verify appeal submission recorded
  TestValidator.equals(
    "appeal_submitted_at is recorded",
    banWithAppealSubmitted.appeal_submitted_at,
    appealSubmittedAt,
  );
  TestValidator.equals(
    "appeal_approved still null before resolution",
    banWithAppealSubmitted.appeal_approved,
    null,
  );

  // 9. Approve the appeal
  const appealResolvedAt = new Date().toISOString();
  const banWithAppealApproved =
    await api.functional.communityPlatform.moderator.communities.bans.update(
      connection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          appeal_resolved_at: appealResolvedAt,
          appeal_approved: true,
        } satisfies ICommunityPlatformCommunityBan.IUpdate,
      },
    );
  typia.assert(banWithAppealApproved);

  // 10. Verify appeal approval persisted correctly
  TestValidator.equals(
    "appeal_approved changed to true",
    banWithAppealApproved.appeal_approved,
    true,
  );
  TestValidator.equals(
    "appeal_resolved_at timestamp recorded",
    banWithAppealApproved.appeal_resolved_at,
    appealResolvedAt,
  );
  TestValidator.equals(
    "appeal_submitted_at preserved",
    banWithAppealApproved.appeal_submitted_at,
    appealSubmittedAt,
  );

  // 11. Verify appeal lifecycle is complete
  TestValidator.predicate("ban has complete appeal workflow", () => {
    return (
      banWithAppealApproved.appeal_submitted_at !== null &&
      banWithAppealApproved.appeal_submitted_at !== undefined &&
      banWithAppealApproved.appeal_resolved_at !== null &&
      banWithAppealApproved.appeal_resolved_at !== undefined &&
      banWithAppealApproved.appeal_approved === true
    );
  });
}
