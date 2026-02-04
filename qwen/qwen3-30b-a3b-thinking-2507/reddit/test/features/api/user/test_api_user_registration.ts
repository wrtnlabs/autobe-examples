import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_registration(connection: api.IConnection) {
  // Step 1: Create actor-specific connection for user authentication
  const userConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate valid random registration data conforming to constraints
  const randomEmail = typia.random<
    string & tags.MinLength<5> & tags.MaxLength<254> & tags.Format<"email">
  >();
  const randomPassword = typia.random<
    string &
      tags.MinLength<8> &
      tags.Pattern<"^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$">
  >();
  const randomDisplayName = typia.random<
    string &
      tags.MinLength<2> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  // Step 3: Register new user using utility function
  const registeredUser = await authorize_user_join(userConnection, {
    body: {
      email: randomEmail,
      password: randomPassword,
      display_name: randomDisplayName,
    },
  });
  // Step 4: Validate all properties in the response
  typia.assert(registeredUser);
}
