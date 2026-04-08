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

export async function test_api_profile_update_display_name_and_bio(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new connection for the member
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Register a new member account using utility function
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 3. Update profile with display name and bio (no avatar)
  const body = {
    displayName: "Jane Smith",
    bio: "Loves hiking and photography",
  } satisfies IRedditCloneUserProfile.IUpdate;
  const profile = await api.functional.redditClone.member.profile.update(
    memberConnection,
    { body },
  );
  typia.assert(profile);
  // 4. Validate the profile was updated correctly
  TestValidator.equals(
    "display name matches",
    profile.displayName,
    body.displayName,
  );
  TestValidator.equals("bio matches", profile.bio, body.bio);
}
