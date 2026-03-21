import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_file_associations_create } from "../../../generate/generate_random_reddit_clone_member_file_associations_create";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";
import { prepare_random_reddit_clone_file_association } from "../../../prepare/prepare_random_reddit_clone_file_association";

export async function test_api_profile_update_full_with_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      username: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Upload avatar image file
  const uploadedFile = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        target_id: authorized.id,
        target_type: "user",
      },
    },
  );
  typia.assert(uploadedFile);
  // 3. Create file association linking file to user
  const fileAssociation =
    await generate_random_reddit_clone_member_file_associations_create(
      memberConnection,
      {
        body: {
          redditCloneFileId: uploadedFile.id,
          targetId: authorized.id,
          targetType: "user",
        },
      },
    );
  typia.assert(fileAssociation);
  // 4. Update profile with display_name, bio, and avatar URI
  const displayName = RandomGenerator.name(2);
  const bio = RandomGenerator.paragraph({ sentences: 3 });
  const updatedProfile = await api.functional.redditClone.users.update(
    memberConnection,
    {
      body: {
        display_name: displayName,
        bio: bio,
        avatar: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMemberSession.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 5. Validate response contains updated profile with nested profile data
  TestValidator.equals(
    "display_name matches",
    updatedProfile.profile.display_name,
    displayName,
  );
  TestValidator.equals("bio matches", updatedProfile.profile.bio, bio);
  TestValidator.predicate("has profile data", updatedProfile.profile !== null);
  TestValidator.predicate("has karma data", updatedProfile.karma !== null);
  TestValidator.predicate(
    "updated_at exists",
    updatedProfile.updated_at !== null &&
      updatedProfile.updated_at !== undefined,
  );
}
