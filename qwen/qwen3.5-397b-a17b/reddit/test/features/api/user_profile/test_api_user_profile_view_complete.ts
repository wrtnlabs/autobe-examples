import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_user_profile_view_complete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create target user account whose profile will be viewed
  const targetUsername = RandomGenerator.name(1);
  const targetUserAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: targetUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(targetUserAuth);
  // 2. Create separate viewing member account
  const viewerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(viewerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 3. Call GET /redditCommunity/member/members/{memberId}/profile with target user's ID
  const profile =
    await api.functional.redditCommunity.member.members.profile.at(
      viewerConnection,
      {
        memberId: targetUserAuth.id,
      },
    );
  typia.assert(profile);
  // 4. Validate response structure and business logic
  TestValidator.equals(
    "profile id matches target user",
    profile.id,
    targetUserAuth.id,
  );
  TestValidator.predicate(
    "display_name is present",
    profile.display_name.length > 0,
  );
  TestValidator.equals("karma score is 0 for new user", profile.karma_score, 0);
  TestValidator.equals(
    "member username matches",
    profile.member.username,
    targetUsername,
  );
}
