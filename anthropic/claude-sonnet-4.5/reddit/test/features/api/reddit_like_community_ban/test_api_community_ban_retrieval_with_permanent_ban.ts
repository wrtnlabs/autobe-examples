import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test retrieval of permanent community ban details without expiration
 * information.
 *
 * This test validates that moderators can issue and retrieve permanent
 * community bans for severe rule violations. The workflow covers moderator and
 * member registration, community creation, permanent ban issuance, and ban
 * detail retrieval.
 *
 * Test workflow:
 *
 * 1. Register moderator account for community management
 * 2. Register member account to receive permanent ban
 * 3. Moderator creates community where ban will be enforced
 * 4. Moderator issues permanent ban against member for severe violations
 * 5. Moderator retrieves ban details to verify permanent ban metadata
 * 6. Validate ban shows no expiration date and permanent enforcement status
 */
export async function test_api_community_ban_retrieval_with_permanent_ban(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Register member account to be banned
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Moderator creates community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
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
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: Issue permanent ban against member for severe violations
  const permanentBan =
    await api.functional.redditLike.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          banned_member_id: member.id,
          ban_reason_category: "harassment",
          ban_reason_text:
            "Severe and repeated harassment of community members violating community guidelines",
          internal_notes:
            "Multiple warnings issued, permanent ban required for community safety",
          is_permanent: true,
          expiration_date: undefined,
        } satisfies IRedditLikeCommunityBan.ICreate,
      },
    );
  typia.assert(permanentBan);

  // Step 5: Retrieve ban details to verify permanent ban metadata
  const retrievedBan =
    await api.functional.redditLike.moderator.communities.bans.at(connection, {
      communityId: community.id,
      banId: permanentBan.id,
    });
  typia.assert(retrievedBan);

  // Step 6: Validate permanent ban metadata
  TestValidator.equals("ban ID matches", retrievedBan.id, permanentBan.id);
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
  TestValidator.equals("ban is permanent", retrievedBan.is_permanent, true);
  TestValidator.equals(
    "expiration date is undefined for permanent ban",
    retrievedBan.expiration_date,
    undefined,
  );
  TestValidator.equals("ban is active", retrievedBan.is_active, true);
  TestValidator.equals(
    "ban reason category matches",
    retrievedBan.ban_reason_category,
    "harassment",
  );
  TestValidator.predicate(
    "ban reason text is present",
    retrievedBan.ban_reason_text.length > 0,
  );
}
