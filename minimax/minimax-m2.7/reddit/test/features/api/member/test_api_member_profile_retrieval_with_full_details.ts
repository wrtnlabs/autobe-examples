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

export async function test_api_member_profile_retrieval_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Update member's profile with display name and bio
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({ sentences: 3 });
  const updated = await api.functional.redditClone.members.update(
    memberConnection,
    {
      body: {
        displayName,
        bio,
      } satisfies IRedditCloneMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 3. Retrieve member profile by ID
  const member = await api.functional.redditClone.members.at(connection, {
    memberId: authorized.id,
  });
  typia.assert(member);
  // Validate all required fields are present
  TestValidator.equals("id matches", member.id, authorized.id);
  TestValidator.equals(
    "username matches",
    member.username,
    authorized.username,
  );
  TestValidator.equals(
    "displayName matches updated value",
    member.displayName,
    displayName,
  );
  TestValidator.equals("bio matches updated value", member.bio, bio);
  TestValidator.equals("karmaScore is 0 for new member", member.karmaScore, 0);
  TestValidator.equals(
    "deletedAt is null for active account",
    member.deletedAt,
    null,
  );
}
