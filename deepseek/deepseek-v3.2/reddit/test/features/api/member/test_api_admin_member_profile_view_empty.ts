import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test admin viewing a new member's profile with no content.
 * Validates edge case where member has just joined and hasn't created any
 * posts or comments, and has zero karma. Verifies that profile still returns
 * proper member information even without content.
 */
export async function test_api_admin_member_profile_view_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create fresh member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    username: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberJoin,
  });
  typia.assert(member);
  // 3. Retrieve member profile as admin
  const profile =
    await api.functional.communityPlatform.admin.members.profile.at(
      adminConnection,
      {
        memberId: member.id,
      },
    );
  typia.assert(profile);
  // 4. Validate profile fields
  TestValidator.equals(
    "username matches",
    profile.username,
    memberJoin.username,
  );
  TestValidator.equals(
    "nickname matches",
    profile.nickname,
    memberJoin.nickname,
  );
  TestValidator.equals("avatar is null", profile.avatar, null);
  TestValidator.equals("karma is zero", profile.karma, 0);
  TestValidator.equals("posts array empty", profile.posts.length, 0);
  TestValidator.equals("comments array empty", profile.comments.length, 0);
  TestValidator.equals("email matches", profile.email, memberJoin.email);
}
