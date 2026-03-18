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

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphabets(8)}@example.com`;
  const username = `member_${RandomGenerator.alphabets(10)}`;
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({ sentences: 3 });
  const avatarImageUri = `https://example.com/${RandomGenerator.alphabets(8)}.png`;
  const output = await authorize_member_join(memberConnection, {
    body: {
      email,
      password: "P@ssw0rd123!",
      username,
      displayName,
      bio,
      avatarImageUri,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(output);
  TestValidator.equals(
    "email should match requested value",
    output.email,
    email,
  );
  TestValidator.equals(
    "username should match requested value",
    output.username,
    username,
  );
  TestValidator.equals(
    "display name should match requested value",
    output.displayName,
    displayName,
  );
  TestValidator.equals("bio should match requested value", output.bio, bio);
  TestValidator.equals(
    "avatar image uri should match requested value",
    output.avatarImageUri,
    avatarImageUri,
  );
  TestValidator.equals("karma should start at zero", output.karma, 0);
  TestValidator.equals(
    "deletedAt should be null for active member",
    output.deletedAt,
    null,
  );
  TestValidator.predicate("token bundle should exist", !!output.token);
}
