import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_avatars_create } from "../../../generate/generate_random_reddit_clone_member_avatars_create";
import { prepare_random_reddit_clone_file_association } from "../../../prepare/prepare_random_reddit_clone_file_association";

export async function test_api_profile_update_with_avatar(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Upload an avatar image to obtain file association ID
  const avatarResponse =
    await generate_random_reddit_clone_member_avatars_create(
      memberConnection,
      {},
    );
  typia.assert(avatarResponse);
  // 3. Update the profile with display name, bio, and avatar
  const profile = await api.functional.redditClone.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: "John Doe" as string & tags.MaxLength<100>,
        bio: "Software developer from Seoul",
        avatarFileId: avatarResponse.id,
      } satisfies IRedditCloneUserProfile.IUpdate,
    },
  );
  typia.assert(profile);
  // 4. Validate the response
  TestValidator.equals("display name matches", profile.displayName, "John Doe");
  TestValidator.equals(
    "bio matches",
    profile.bio,
    "Software developer from Seoul",
  );
  TestValidator.predicate("avatar exists", profile.avatar !== undefined);
  TestValidator.equals(
    "avatar original filename exists",
    profile.avatar!.file.originalFilename.length > 0,
    true,
  );
  TestValidator.equals(
    "avatar mime type exists",
    profile.avatar!.file.mimeType.length > 0,
    true,
  );
  TestValidator.predicate(
    "avatar uploader exists",
    profile.avatar!.file.uploader !== undefined,
  );
}
