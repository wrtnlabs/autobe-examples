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

export async function test_api_profile_clear_bio_and_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Establish initial profile with bio
  const initialBio = RandomGenerator.paragraph({ sentences: 3 });
  const initialProfile = await api.functional.redditClone.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: authorized.username,
        bio: initialBio,
      } satisfies IRedditCloneUserProfile.IUpdate,
    },
  );
  typia.assert(initialProfile);
  TestValidator.equals("bio set initially", initialProfile.bio, initialBio);
  TestValidator.equals("avatar null initially", initialProfile.avatar, null);
  // 3. Clear bio to null
  const clearedProfile = await api.functional.redditClone.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: authorized.username,
        bio: null,
        avatar_file_uri: null,
      } satisfies IRedditCloneUserProfile.IUpdate,
    },
  );
  typia.assert(clearedProfile);
  // 4. Validate bio is null after clearing
  TestValidator.equals("bio cleared to null", clearedProfile.bio, null);
  // 5. Validate avatar remains null
  TestValidator.equals("avatar still null", clearedProfile.avatar, null);
  // 6. Validate display_name preserved
  TestValidator.equals(
    "display_name preserved",
    clearedProfile.display_name,
    authorized.username,
  );
}
