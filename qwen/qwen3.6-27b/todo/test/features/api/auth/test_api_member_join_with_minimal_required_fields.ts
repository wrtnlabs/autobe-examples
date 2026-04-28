import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_with_minimal_required_fields(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const body = {
    display_name: null,
    email: typia.random<string & tags.Format<"email">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    password: RandomGenerator.alphaNumeric(16),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMember.IJoin;
  const response = await authorize_member_join(memberConnection, { body });
  typia.assert(response);
  TestValidator.equals("display_name is null", response.display_name, null);
  TestValidator.equals("email matches input", response.email, body.email);
  TestValidator.equals("account is active", response.deleted_at, null);
  TestValidator.predicate(
    "has access token",
    response.token.access !== undefined,
  );
  TestValidator.predicate(
    "has refresh token",
    response.token.refresh !== undefined,
  );
}
