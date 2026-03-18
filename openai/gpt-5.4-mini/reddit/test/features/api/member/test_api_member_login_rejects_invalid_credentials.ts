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

export async function test_api_member_login_rejects_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const password = typia.random<string & tags.Format<"password">>();
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(joined);
  let unknownEmail = typia.random<string & tags.Format<"email">>();
  while (unknownEmail === joined.email)
    unknownEmail = typia.random<string & tags.Format<"email">>();
  const unknownEmailConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "member login should reject unknown email",
    async () => {
      await authorize_member_login(unknownEmailConnection, {
        body: {
          email: unknownEmail,
          password: typia.random<string & tags.Format<"password">>(),
        } satisfies ICommunityPlatformMember.ILogin,
      });
    },
  );
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "member login should reject incorrect password",
    async () => {
      await authorize_member_login(wrongPasswordConnection, {
        body: {
          email: joined.email,
          password: typia.random<string & tags.Format<"password">>(),
        } satisfies ICommunityPlatformMember.ILogin,
      });
    },
  );
}
