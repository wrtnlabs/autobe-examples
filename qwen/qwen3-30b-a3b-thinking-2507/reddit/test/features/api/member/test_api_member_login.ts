import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const registerConnection: api.IConnection = { host: connection.host };
  const registration: ICommunityMember.IAuthorized =
    await authorize_member_join(registerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(2),
      } satisfies ICommunityMember.IJoin,
    });
  // 2. Log in as the newly registered member
  const loginConnection: api.IConnection = { host: connection.host };
  const auth: ICommunityMember.IAuthorized = await authorize_member_login(
    loginConnection,
    {
      body: {
        email: registration.email,
        password: "TestPass1!",
      } satisfies ICommunityMember.ILogin,
    },
  );
  // 3. Validate the login response
  typia.assert(auth);
}
