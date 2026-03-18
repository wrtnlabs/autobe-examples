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

export async function test_api_guest_join_duplicate_identity_conflict(
  connection: api.IConnection,
): Promise<void> {
  const firstConnection: api.IConnection = { host: connection.host };
  const firstAuthorized = await authorize_guest_join(firstConnection, {
    body: {},
  });
  typia.assert(firstAuthorized);
  TestValidator.predicate(
    "first guest identity should be active",
    firstAuthorized.deleted_at === null,
  );
  TestValidator.predicate(
    "first guest token should exist",
    firstAuthorized.token.access.length > 0 &&
      firstAuthorized.token.refresh.length > 0,
  );
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate guest identity conflict should fail",
    async () => {
      const secondAuthorized = await authorize_guest_join(secondConnection, {
        body: {},
      });
      typia.assert(secondAuthorized);
      TestValidator.predicate(
        "second join must not succeed with another active session",
        false,
      );
    },
  );
}
