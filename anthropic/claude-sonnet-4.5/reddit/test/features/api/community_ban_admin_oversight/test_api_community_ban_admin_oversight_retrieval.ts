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

export async function test_api_community_ban_admin_oversight_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member account to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create moderator account to issue the ban
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Moderator creates community where ban will be issued
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: Moderator issues community ban against the member
  const banReasons = [
    "spam",
    "harassment",
    "rule_violation",
    "inappropriate_content",
  ] as const;
  const banReason = RandomGenerator.pick(banReasons);

  const issuedBan: IRedditLikeCommunityBan =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          banned_member_id: member.id,
          ban_reason_category: banReason,
          ban_reason_text: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
          is_permanent: true,
        } satisfies IRedditLikeCommunityBan.ICreate,
      },
    );
  typia.assert(issuedBan);

  // Step 5: Create administrator account for platform-wide oversight
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 6: Administrator retrieves ban details for oversight review
  const retrievedBan: IRedditLikeCommunityBan =
    await api.functional.redditLike.admin.communities.bans.at(connection, {
      communityId: community.id,
      banId: issuedBan.id,
    });
  typia.assert(retrievedBan);

  // Validate that administrator can access complete ban context
  TestValidator.equals(
    "retrieved ban ID matches issued ban",
    retrievedBan.id,
    issuedBan.id,
  );
  TestValidator.equals(
    "banned member ID matches",
    retrievedBan.banned_member_id,
    member.id,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedBan.community_id,
    community.id,
  );
  TestValidator.equals(
    "ban reason category matches",
    retrievedBan.ban_reason_category,
    issuedBan.ban_reason_category,
  );
  TestValidator.equals(
    "ban reason text matches",
    retrievedBan.ban_reason_text,
    issuedBan.ban_reason_text,
  );
  TestValidator.equals(
    "permanent ban status matches",
    retrievedBan.is_permanent,
    issuedBan.is_permanent,
  );
  TestValidator.equals(
    "ban active status matches",
    retrievedBan.is_active,
    issuedBan.is_active,
  );
}
