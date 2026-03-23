import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare valid device credentials
  const body = {
    device_id: typia.random<string & tags.Format<"uuid">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    user_agent: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppGuest.IJoin;
  // Register guest account
  const output = await authorize_guest_join(
    { host: connection.host },
    { body },
  );
  typia.assert(output);
  // Validate guest account structure
  TestValidator.predicate("has valid guest id", () => {
    typia.assert<string & tags.Format<"uuid">>(output.id);
    return true;
  });
  // Validate token structure
  TestValidator.equals(
    "access token present",
    output.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token present",
    output.token.refresh.length > 0,
    true,
  );
  // Validate timestamp formats
  TestValidator.predicate("expired_at is valid datetime", () => {
    typia.assert<string & tags.Format<"date-time">>(output.token.expired_at);
    return true;
  });
  TestValidator.predicate("refreshable_until is valid datetime", () => {
    typia.assert<string & tags.Format<"date-time">>(
      output.token.refreshable_until,
    );
    return true;
  });
}