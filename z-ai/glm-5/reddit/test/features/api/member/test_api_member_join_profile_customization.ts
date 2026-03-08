import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_profile_customization(
  connection: api.IConnection,
): Promise<void> {
  // Prepare unique registration data with custom profile fields
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.alphaNumeric(8);
  // Custom profile fields that differ from username
  const customDisplayName = RandomGenerator.name();
  const customBio = RandomGenerator.paragraph({ sentences: 3 });
  const customAvatarUrl = typia.random<string & tags.Format<"url">>();
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Register member with custom profile using utility function
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      username,
      displayName: customDisplayName,
      bio: customBio,
      avatarUrl: customAvatarUrl,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // Validate all optional profile fields are correctly stored
  TestValidator.equals(
    "displayName matches input",
    authorized.displayName,
    customDisplayName,
  );
  TestValidator.notEquals(
    "displayName differs from username",
    authorized.displayName,
    username,
  );
  TestValidator.equals("bio matches input", authorized.bio, customBio);
  TestValidator.equals(
    "avatarUrl matches input",
    authorized.avatarUrl,
    customAvatarUrl,
  );
  TestValidator.equals("karma initialized to 0", authorized.karma, 0);
  // Validate member summary structure
  TestValidator.equals(
    "member displayName matches",
    authorized.member.display_name,
    customDisplayName,
  );
  TestValidator.equals("member bio matches", authorized.member.bio, customBio);
  TestValidator.equals(
    "member avatarUrl matches",
    authorized.member.avatar_url,
    customAvatarUrl,
  );
  TestValidator.equals("member karma is 0", authorized.member.karma, 0);
}
