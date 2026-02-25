import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_default_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user account with a specific email address
  const userConnection: api.IConnection = { host: connection.host };
  const testEmail = "newuser@example.com";
  const password = "Password123!";
  const authResult = await authorize_user_join(userConnection, {
    body: {
      email: testEmail,
      password: password,
      password_confirm: password,
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  typia.assert(authResult);
  // 2. Retrieve the user's profile
  const profile = await api.functional.todoApp.user.profile.at(userConnection);
  typia.assert(profile);
  // 3. Verify that display_name equals the email used during registration
  TestValidator.equals(
    "display_name defaults to email on registration",
    profile.display_name,
    testEmail,
  );
}
