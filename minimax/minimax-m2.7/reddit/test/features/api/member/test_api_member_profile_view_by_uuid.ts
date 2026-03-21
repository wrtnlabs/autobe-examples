import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
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

export async function test_api_member_profile_view_by_uuid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member to get a valid memberId for profile retrieval
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Retrieve the member's public profile by UUID
  const memberProfile = await api.functional.redditClone.members.at(
    connection,
    {
      memberId: authorized.id,
    },
  );
  typia.assert(memberProfile);
  // 3. Validate core member fields
  TestValidator.equals(
    "username matches",
    memberProfile.username,
    authorized.username,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(memberProfile.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(memberProfile.updated_at),
  );
  // 4. Validate karma_score is a valid integer
  TestValidator.equals(
    "karma_score is number",
    typeof memberProfile.karma_score,
    "number",
  );
  // 5. Validate profile object with display_name, bio, and avatar
  TestValidator.equals("profile exists", memberProfile.profile !== null, true);
  TestValidator.equals(
    "profile display_name exists",
    memberProfile.profile.display_name !== undefined,
    true,
  );
  TestValidator.equals(
    "bio is string or null",
    typeof memberProfile.profile.bio === "string" ||
      memberProfile.profile.bio === null,
    true,
  );
  TestValidator.equals(
    "avatar is null or file association",
    memberProfile.profile.avatar === null ||
      typeof memberProfile.profile.avatar === "object",
    true,
  );
  // 6. Validate posts array exists
  TestValidator.equals(
    "posts is array",
    Array.isArray(memberProfile.posts),
    true,
  );
  // 7. Validate comments array exists
  TestValidator.equals(
    "comments is array",
    Array.isArray(memberProfile.comments),
    true,
  );
}
