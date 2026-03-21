import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
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

export async function test_api_member_join_profile_auto_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCloneMemberSession.IJoin;
  const authorized = await authorize_member_join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // 2. Validate that profile was automatically created
  TestValidator.notEquals("profile exists", authorized.profile, null);
  // 3. Validate profile display_name matches the username from registration
  TestValidator.equals(
    "display_name matches username",
    authorized.profile.display_name,
    joinBody.username,
  );
  // 4. Validate bio is null by default (no bio provided during registration)
  TestValidator.equals("bio is null", authorized.profile.bio, null);
  // 5. Validate avatar is null (no avatar uploaded during registration)
  TestValidator.equals("avatar is null", authorized.profile.avatar, null);
  // 6. Validate profile owner relationship is properly associated
  TestValidator.equals(
    "owner.id matches member id",
    authorized.profile.owner.id,
    authorized.id,
  );
  TestValidator.equals(
    "owner.username matches member username",
    authorized.profile.owner.username,
    authorized.username,
  );
}
