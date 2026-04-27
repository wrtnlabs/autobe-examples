import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_full_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  const initialProfile = authorized.profile;
  const createdAt = initialProfile.created_at;
  const memberId = authorized.id;
  const memberEmail = authorized.email;
  const memberUsername = authorized.username;
  // 2. Update all three profile fields simultaneously
  const updatedProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: "John Doe",
          biography: "A passionate community member",
          avatar_uri: "https://example.com/avatar.png",
        } as ICommunityPlatformProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 3. Assert display_name equals "John Doe"
  TestValidator.equals("display_name", updatedProfile.display_name, "John Doe");
  // 4. Assert biography equals "A passionate community member"
  TestValidator.equals(
    "biography",
    updatedProfile.biography,
    "A passionate community member",
  );
  // 5. Assert avatar_uri equals "https://example.com/avatar.png"
  TestValidator.equals(
    "avatar_uri",
    updatedProfile.avatar_uri,
    "https://example.com/avatar.png",
  );
  // 6. Assert karma remains 0 (karma is system-managed via vote operations, not profile update)
  TestValidator.equals("karma", updatedProfile.karma, 0);
  // 7. Assert member summary matches the join response
  TestValidator.equals("member.id", updatedProfile.member.id, memberId);
  TestValidator.equals(
    "member.email",
    updatedProfile.member.email,
    memberEmail,
  );
  TestValidator.equals(
    "member.username",
    updatedProfile.member.username,
    memberUsername,
  );
  // 8. Assert updated_at is newer than created_at
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedProfile.updated_at).getTime() >
      new Date(createdAt).getTime(),
  );
}
