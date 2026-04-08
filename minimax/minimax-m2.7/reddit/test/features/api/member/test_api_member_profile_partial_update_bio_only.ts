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

export async function test_api_member_profile_partial_update_bio_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member via authorize_member_join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Call PATCH /redditClone/members with only the bio field set
  const newBio = "This is my updated bio for testing partial update.";
  const updatedMember = await api.functional.redditClone.members.update(
    memberConnection,
    {
      body: {
        bio: newBio,
      } satisfies IRedditCloneMember.IUpdate,
    },
  );
  typia.assert(updatedMember);
  // 3. Validate HTTP 200 response with complete member profile
  TestValidator.equals("member id preserved", updatedMember.id, authorized.id);
  TestValidator.equals(
    "username preserved",
    updatedMember.username,
    authorized.username,
  );
  // 4. Verify the bio field contains the new value
  TestValidator.equals("bio updated correctly", updatedMember.bio, newBio);
  // 5. Verify display_name is populated (falls back to username)
  TestValidator.equals(
    "displayName falls back to username",
    updatedMember.displayName,
    authorized.username,
  );
  // 6. Verify avatar remains null
  TestValidator.equals("avatar remains null", updatedMember.avatar, null);
  // Validate complete profile structure
  TestValidator.predicate(
    "karmaScore is valid number",
    typeof updatedMember.karmaScore === "number",
  );
  TestValidator.predicate(
    "createdAt is valid date-time string",
    typeof updatedMember.createdAt === "string",
  );
  TestValidator.predicate(
    "updatedAt is valid date-time string",
    typeof updatedMember.updatedAt === "string",
  );
}
