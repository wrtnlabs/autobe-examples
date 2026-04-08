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

export async function test_api_member_profile_retrieval_with_defaults(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member using authorize_member_join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditCloneMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  // 2. Retrieve the member profile using GET /redditClone/members/{memberId}
  const profile: IRedditCloneMember =
    await api.functional.redditClone.members.at(connection, {
      memberId: authorized.id,
    });
  typia.assert(profile);
  // 3. Validate default profile values
  TestValidator.equals("id matches created member", profile.id, authorized.id);
  TestValidator.equals(
    "username matches created member",
    profile.username,
    authorized.username,
  );
  TestValidator.equals(
    "displayName defaults to username",
    profile.displayName,
    authorized.username,
  );
  TestValidator.equals("bio is null", profile.bio, null);
  TestValidator.equals("avatar is null", profile.avatar, null);
  TestValidator.equals("karmaScore is 0", profile.karmaScore, 0);
  TestValidator.equals("deletedAt is null", profile.deletedAt, null);
  TestValidator.predicate(
    "createdAt is valid timestamp",
    (() => {
      const date = new Date(profile.createdAt);
      return !isNaN(date.getTime());
    })(),
  );
  TestValidator.predicate(
    "updatedAt is valid timestamp",
    (() => {
      const date = new Date(profile.updatedAt);
      return !isNaN(date.getTime());
    })(),
  );
}
