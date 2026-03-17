import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can successfully retrieve their complete profile information.
 * 1. Register new member account
 * 2. Create authenticated connection with access token
 * 3. Retrieve member profile
 * 4. Validate all profile fields
 */
export async function test_api_member_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member with random credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResponse);
  // 2. Create authenticated connection with access token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joinResponse.token.access,
    },
  };
  // 3. Retrieve member profile
  const profile = await api.functional.redditCommunity.member.profile.at(
    authenticatedConnection,
  );
  typia.assert(profile);
  // 4. Validate user identity object
  TestValidator.equals(
    "username present",
    profile.user.username.length > 0,
    true,
  );
  // 5. Validate display name
  TestValidator.equals(
    "display name present",
    profile.display_name.length > 0,
    true,
  );
  // 6. Validate bio (can be null or empty string)
  TestValidator.equals(
    "bio is valid type",
    profile.bio === null || typeof profile.bio === "string",
    true,
  );
  // 7. Validate avatar image URL ID (can be null for new member)
  TestValidator.equals(
    "avatar image url id is valid type",
    profile.avatar_image_url_id === null ||
      typeof profile.avatar_image_url_id === "string",
    true,
  );
  // 8. Validate karma object
  TestValidator.equals(
    "karma current score is number",
    typeof profile.karma.current_score === "number",
    true,
  );
  TestValidator.equals(
    "karma reddit member id present",
    profile.karma.reddit_member_id.length > 0,
    true,
  );
  // 9. Validate posts pagination
  TestValidator.equals(
    "posts data is array",
    Array.isArray(profile.posts.data),
    true,
  );
  TestValidator.equals(
    "posts current page is 1",
    profile.posts.pagination.current,
    1,
  );
  TestValidator.equals(
    "posts records count is 0",
    profile.posts.pagination.records,
    0,
  );
  TestValidator.equals(
    "posts pages count is 0 or 1",
    profile.posts.pagination.pages === 0 ||
      profile.posts.pagination.pages === 1,
    true,
  );
  // 10. Validate comments pagination
  TestValidator.equals(
    "comments data is array",
    Array.isArray(profile.comments.data),
    true,
  );
  TestValidator.equals(
    "comments current page is 1",
    profile.comments.pagination.current,
    1,
  );
  TestValidator.equals(
    "comments records count is 0",
    profile.comments.pagination.records,
    0,
  );
  TestValidator.equals(
    "comments pages count is 0 or 1",
    profile.comments.pagination.pages === 0 ||
      profile.comments.pagination.pages === 1,
    true,
  );
  // 11. Validate timestamps are ISO 8601 date-time format (already validated by typia.assert)
  TestValidator.equals(
    "deleted at is null for active account",
    profile.deleted_at,
    null,
  );
  // 12. Validate created_at and updated_at timestamps exist
  TestValidator.equals(
    "created_at is present",
    profile.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "updated_at is present",
    profile.updated_at.length > 0,
    true,
  );
}
