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

export async function test_api_member_successful_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate valid test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(10).toLowerCase() as string &
    tags.MinLength<3> &
    tags.MaxLength<50>;
  // Registration doesn't require password in body according to DTO
  // Register new user with valid credentials
  const output: ICommunityMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email,
        username,
      },
    },
  );
  // Validate response structure
  typia.assert(output);
  // Verify token validity and business rules
  TestValidator.equals(
    "access token exists",
    output.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    output.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "email verification triggered",
    output.access.length > 0,
    true,
  );
  TestValidator.equals("username matches input", output.username, username);
  TestValidator.equals("email matches input", output.email, email);
}
