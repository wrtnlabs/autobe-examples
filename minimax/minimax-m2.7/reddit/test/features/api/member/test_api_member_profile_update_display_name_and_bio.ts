import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_display_name_and_bio(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member by registering a new account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Generate new display name (max 100 chars) and bio text (max 500 chars)
  const newDisplayName = RandomGenerator.paragraph({ sentences: 1 }).substring(
    0,
    100,
  );
  const newBio = RandomGenerator.paragraph({ sentences: 5 }).substring(0, 500);
  // 3. Call PATCH /redditClone/members to update profile
  const updatedMember = await api.functional.redditClone.members.update(
    memberConnection,
    {
      body: {
        displayName: newDisplayName satisfies string & tags.MaxLength<100>,
        bio: newBio satisfies string & tags.MaxLength<500>,
      },
    },
  );
  typia.assert(updatedMember);
  // 4. Validate response structure and updated values
  TestValidator.equals("id matches", updatedMember.id, authorized.id);
  TestValidator.equals(
    "username matches",
    updatedMember.username,
    authorized.username,
  );
  TestValidator.equals(
    "display_name updated",
    updatedMember.displayName,
    newDisplayName,
  );
  TestValidator.equals("bio updated", updatedMember.bio, newBio);
  TestValidator.predicate("avatar is null", updatedMember.avatar === null);
  TestValidator.predicate(
    "karma_score is valid number",
    typeof updatedMember.karmaScore === "number",
  );
  TestValidator.predicate(
    "created_at exists",
    typeof updatedMember.createdAt === "string",
  );
  TestValidator.predicate(
    "updated_at exists",
    typeof updatedMember.updatedAt === "string",
  );
}
