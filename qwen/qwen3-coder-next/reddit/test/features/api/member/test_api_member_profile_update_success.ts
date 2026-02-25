import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const joinConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(registeredMember);
  // 2. Update profile with valid data
  const updateConnection: api.IConnection = { host: connection.host };
  const updatedMember = await api.functional.redditClone.member.users.me.update(
    updateConnection,
    {
      body: {
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        avatar_url: null,
      } satisfies IRedditCloneMember.IUpdate,
    },
  );
  typia.assert(updatedMember);
  // 3. Validate updated profile
  const originalMember = registeredMember;
  TestValidator.equals(
    "email unchanged",
    updatedMember.email,
    originalMember.email,
  );
  TestValidator.equals(
    "username unchanged",
    updatedMember.username,
    originalMember.username,
  );
  TestValidator.equals(
    "karma unchanged",
    updatedMember.karma,
    originalMember.karma,
  );
  TestValidator.equals(
    "createdAt unchanged",
    updatedMember.createdAt,
    originalMember.createdAt,
  );
  TestValidator.notEquals(
    "displayName updated",
    updatedMember.displayName,
    originalMember.displayName,
  );
  TestValidator.equals("bio updated", updatedMember.bio, originalMember.bio);
  TestValidator.equals(
    "avatarUrl unchanged",
    updatedMember.avatarUrl,
    originalMember.avatarUrl,
  );
}
