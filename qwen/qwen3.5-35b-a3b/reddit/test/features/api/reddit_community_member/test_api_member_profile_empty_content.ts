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

export async function test_api_member_profile_empty_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IRedditCommunityMember.IJoin>,
  });
  typia.assert(memberAuth);
  // 2. Update connection with new member's authorization token
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // 3. Retrieve member profile
  const profile: IRedditCommunityUserProfile =
    await api.functional.redditCommunity.member.profile.at(memberConnection);
  typia.assert(profile);
  // 4. Validate pagination metadata shows empty content
  TestValidator.equals(
    "posts pagination records",
    profile.posts.pagination.records,
    0,
  );
  TestValidator.equals(
    "posts pagination pages",
    profile.posts.pagination.pages,
    0,
  );
  TestValidator.equals(
    "comments pagination records",
    profile.comments.pagination.records,
    0,
  );
  TestValidator.equals(
    "comments pagination pages",
    profile.comments.pagination.pages,
    0,
  );
  // 5. Validate empty data arrays
  TestValidator.equals("posts data is empty", profile.posts.data.length, 0);
  TestValidator.equals(
    "comments data is empty",
    profile.comments.data.length,
    0,
  );
  // 6. Validate karma score is 0
  TestValidator.equals(
    "karma current_score equals 0",
    profile.karma.current_score,
    0,
  );
  // 7. Validate profile fields
  TestValidator.equals(
    "display_name exists",
    profile.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "user.username exists",
    profile.user.username.length > 0,
    true,
  );
  TestValidator.equals(
    "user.id is valid uuid",
    typia.is<string & tags.Format<"uuid">>(profile.user.id),
    true,
  );
  TestValidator.equals(
    "user.created_at is valid date-time",
    typia.is<string & tags.Format<"date-time">>(profile.user.created_at),
    true,
  );
  // 8. Validate optional fields are null/undefined for new member
  TestValidator.equals("bio is null for new member", profile.bio, null);
  TestValidator.equals(
    "avatar_image_url_id is null for new member",
    profile.avatar_image_url_id,
    null,
  );
  // 9. Validate timestamp fields are present and valid
  TestValidator.equals(
    "created_at is valid date-time",
    typia.is<string & tags.Format<"date-time">>(profile.created_at),
    true,
  );
  TestValidator.equals(
    "updated_at is valid date-time",
    typia.is<string & tags.Format<"date-time">>(profile.updated_at),
    true,
  );
  TestValidator.equals(
    "deleted_at is null for active member",
    profile.deleted_at,
    null,
  );
}