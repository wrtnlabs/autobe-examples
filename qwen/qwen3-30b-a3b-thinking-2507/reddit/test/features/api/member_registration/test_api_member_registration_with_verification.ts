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

export async function test_api_member_registration_with_verification(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "1234";
  const username = RandomGenerator.name();
  const memberResult = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      username,
    },
  });
  typia.assert(memberResult);
  TestValidator.equals(
    "ID must be valid UUID",
    memberResult.id,
    memberResult.id,
  );
  TestValidator.equals("Email must match input", memberResult.email, email);
  TestValidator.equals(
    "Token must be present",
    memberResult.token.refresh,
    memberResult.token.refresh,
  );
}
