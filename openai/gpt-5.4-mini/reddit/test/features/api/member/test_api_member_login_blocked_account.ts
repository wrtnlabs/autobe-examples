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

export async function test_api_member_login_blocked_account(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const username = RandomGenerator.alphabets(8);
  const displayName = RandomGenerator.name();
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      username,
      displayName,
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(6)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const authorized = await authorize_member_login(memberConnection, {
    body: {
      email,
      password,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(authorized);
  TestValidator.equals("logged in email should match", authorized.email, email);
  TestValidator.equals(
    "logged in username should match",
    authorized.username,
    username,
  );
  TestValidator.equals(
    "display name should match",
    authorized.displayName,
    displayName,
  );
  TestValidator.equals("karma should start at zero", authorized.karma, 0);
  TestValidator.equals("deletedAt should be null", authorized.deletedAt, null);
}
