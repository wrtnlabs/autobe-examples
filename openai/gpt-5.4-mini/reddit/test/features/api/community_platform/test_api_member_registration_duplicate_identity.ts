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

export async function test_api_member_registration_duplicate_identity(
  connection: api.IConnection,
): Promise<void> {
  const firstConnection: api.IConnection = { host: connection.host };
  const firstBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarImageUri: `https://example.com/avatar-${RandomGenerator.alphaNumeric(8)}.png`,
  } satisfies ICommunityPlatformMember.IJoin;
  const firstMember = await authorize_member_join(firstConnection, {
    body: firstBody,
  });
  typia.assert(firstMember);
  const duplicateConnection: api.IConnection = { host: connection.host };
  const duplicateBody = {
    email: firstBody.email,
    password: RandomGenerator.alphaNumeric(12),
    username: `${firstBody.username}x`,
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarImageUri: `https://example.com/avatar-${RandomGenerator.alphaNumeric(8)}.png`,
  } satisfies ICommunityPlatformMember.IJoin;
  await TestValidator.httpError(
    "duplicate member identity should be rejected",
    [400, 409],
    async () => {
      await authorize_member_join(duplicateConnection, {
        body: duplicateBody,
      });
    },
  );
}
