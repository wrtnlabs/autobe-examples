import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_join_authorized_payload_complete(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const output = await authorize_administrator_join(administratorConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(output);
  TestValidator.equals(
    "administrator email matches join request",
    output.email,
    email,
  );
  TestValidator.predicate("administrator id is present", output.id.length > 0);
  TestValidator.predicate(
    "administrator grade is present",
    output.grade.length > 0,
  );
  TestValidator.predicate(
    "administrator status is present",
    output.status.length > 0,
  );
  TestValidator.predicate(
    "token access is present",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is present",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token access expiration is present",
    output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refreshable deadline is present",
    output.token.refreshable_until.length > 0,
  );
  TestValidator.equals(
    "new administrator is not soft deleted",
    output.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at is present",
    output.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    output.updated_at.length > 0,
  );
}
