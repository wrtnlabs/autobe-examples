import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

export async function test_api_community_ban_admin_moderation_audit(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for auditing
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create moderator account who will create community and issue ban
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 3: Create member account who will be banned
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Switch back to moderator to create community (moderator becomes primary moderator)
  await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });

  const communityData = {
    code: RandomGenerator.alphaNumeric(15),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 5: Moderator issues ban against member
  const banReasonCategories = [
    "spam",
    "harassment",
    "hate_speech",
    "misinformation",
  ] as const;
  const selectedCategory = RandomGenerator.pick(banReasonCategories);

  const banData = {
    banned_member_id: member.id,
    ban_reason_category: selectedCategory,
    ban_reason_text: RandomGenerator.paragraph({ sentences: 3 }),
    internal_notes: RandomGenerator.paragraph({ sentences: 2 }),
    is_permanent: false,
    expiration_date: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies IRedditLikeCommunityBan.ICreate;

  const issuedBan: IRedditLikeCommunityBan =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: banData,
      },
    );
  typia.assert(issuedBan);

  // Step 6: Switch to administrator account for audit
  await api.functional.auth.admin.join(connection, {
    body: adminData,
  });

  const auditedBan: IRedditLikeCommunityBan =
    await api.functional.redditLike.admin.communities.bans.at(connection, {
      communityId: community.id,
      banId: issuedBan.id,
    });
  typia.assert(auditedBan);

  // Validate ban details match what was issued
  TestValidator.equals("ban ID matches", auditedBan.id, issuedBan.id);
  TestValidator.equals(
    "banned member ID matches",
    auditedBan.banned_member_id,
    member.id,
  );
  TestValidator.equals(
    "community ID matches",
    auditedBan.community_id,
    community.id,
  );
  TestValidator.equals(
    "ban reason category matches",
    auditedBan.ban_reason_category,
    selectedCategory,
  );
  TestValidator.equals(
    "ban reason text matches",
    auditedBan.ban_reason_text,
    banData.ban_reason_text,
  );
  TestValidator.equals(
    "ban permanence status matches",
    auditedBan.is_permanent,
    false,
  );
  TestValidator.equals(
    "ban expiration date matches",
    auditedBan.expiration_date,
    banData.expiration_date,
  );
  TestValidator.equals("ban active status", auditedBan.is_active, true);
}
