import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import type { IRedditCommunityFileOfCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfCommunity";
import type { IRedditCommunityFileOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfUser";
import type { IRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileThumbnail";
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
import { generate_random_reddit_community_member_files_create } from "../../../generate/generate_random_reddit_community_member_files_create";
import { prepare_random_reddit_community_file } from "../../../prepare/prepare_random_reddit_community_file";

export async function test_api_member_profile_update_avatar_attachment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const joinConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create authenticated connection for member operations
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: auth.token.access },
  };
  // 3. Upload an avatar image file
  // Generate a realistic image URI for testing
  const imageFileName = `${typia.random<string & tags.Format<"uuid">>().toString()}.png`;
  const avatarFile = await generate_random_reddit_community_member_files_create(
    memberConnection,
    {
      body: {
        file_type: "avatar", // This will map to 'user_avatar' for fileType
        owner_id: typia.random<string & tags.Format<"uuid">>(), // Temporary ID, backend resolves from token
        file_uri: `https://cdn.example.com/images/${imageFileName}`,
      } satisfies IRedditCommunityFile.ICreate,
    },
  );
  typia.assert(avatarFile);
  // 4. Update member profile with the avatar ID
  const updatedProfile =
    await api.functional.redditCommunity.member.profile.update(
      memberConnection,
      {
        body: {
          avatar_image_url_id: avatarFile.id,
        } satisfies IRedditCommunityUserProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 5. Validate avatar was set correctly on the profile
  TestValidator.equals(
    "avatar_image_url_id matches uploaded file ID",
    updatedProfile.avatar_image_url_id,
    avatarFile.id,
  );
  // Verify the profile has a valid display name (always present)
  TestValidator.predicate(
    "profile has display name",
    updatedProfile.display_name.length > 0,
  );
  // Verify karma score exists
  TestValidator.equals(
    "karma score is a number",
    typeof updatedProfile.karma.current_score,
    "number",
  );
}