import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
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

export async function test_api_profile_guest_viewing_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account with complete profile information
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Access the profile as a guest (no authentication)
  // Use a fresh connection without any auth headers
  const guestConnection: api.IConnection = { host: connection.host };
  const profile = await api.functional.redditClone.profiles.at(
    guestConnection,
    {
      memberId: memberAuth.id,
    },
  );
  typia.assert(profile);
  // 3. Validate profile data matches the created member
  TestValidator.equals("member ID matches", profile.id, memberAuth.id);
  TestValidator.equals(
    "username matches",
    profile.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    memberAuth.display_name,
  );
  TestValidator.equals(
    "deleted_at is null for active profile",
    profile.deleted_at,
    null,
  );
}
