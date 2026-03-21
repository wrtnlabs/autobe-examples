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

export async function test_api_profile_update_clear_avatar_and_bio(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Upload an image file to use as avatar
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {
      body: {
        target_id: authorized.id,
        target_type: "user",
      },
    },
  );
  typia.assert(file);
  // 3. Associate the file with the user as avatar
  await generate_random_reddit_clone_member_file_associations_create(
    memberConnection,
    {
      body: {
        redditCloneFileId: file.id,
        targetId: authorized.id,
        targetType: "user",
      },
    },
  );
  // 4. Update profile: clear bio (omit bio field) and remove avatar (omit avatar field)
  const updatedProfile = await api.functional.redditClone.users.update(
    memberConnection,
    {
      body: {
        display_name: RandomGenerator.name(),
      } satisfies IRedditCloneMemberSession.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 5. Validate bio is cleared (profile.bio is undefined since we omitted it)
  TestValidator.equals("bio is cleared", updatedProfile.profile.bio, undefined);
  // 6. Validate avatar is removed (profile.avatar is undefined since we omitted avatar field)
  TestValidator.equals("avatar is removed", updatedProfile.profile.avatar, undefined);
  // 7. Edge case: Test with display_name approaching max 100 characters
  const longDisplayName = RandomGenerator.alphabets(95); // 95 chars, will be truncated if > 100
  const edgeCaseProfile = await api.functional.redditClone.users.update(
    memberConnection,
    {
      body: {
        display_name: longDisplayName,
      } satisfies IRedditCloneMemberSession.IUpdate,
    },
  );
  typia.assert(edgeCaseProfile);
  // 8. Validate display_name is properly handled (may be truncated to 100 chars max)
  TestValidator.predicate(
    "display_name length is valid",
    edgeCaseProfile.profile.display_name.length <= 100,
  );
}