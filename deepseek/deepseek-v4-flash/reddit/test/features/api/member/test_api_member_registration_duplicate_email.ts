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

export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the first member with a specific email
  const email = typia.random<string & tags.Format<"email">>();
  const firstConnection: api.IConnection = { host: connection.host };
  const first = await authorize_member_join(firstConnection, {
    body: {
      email,
      username: "first_user",
      password: "password123!",
    },
  });
  typia.assert(first);
  // 2. Attempt to register a second member with the same email but different username
  await TestValidator.httpError("duplicate email", 409, async () => {
    const secondConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(secondConnection, {
      body: {
        email,
        username: "second_user",
        password: "password456!",
      },
    });
  });
}
