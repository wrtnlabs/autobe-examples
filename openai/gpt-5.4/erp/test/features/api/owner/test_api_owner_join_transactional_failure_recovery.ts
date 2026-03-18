import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_join_transactional_failure_recovery(
  connection: api.IConnection,
): Promise<void> {
  const existingEmail = typia.random<string & tags.Format<"email">>();
  const firstJoinConnection: api.IConnection = { host: connection.host };
  const firstJoin = await authorize_owner_join(firstJoinConnection, {
    body: {
      email: existingEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstJoin);
  TestValidator.equals(
    "first owner email matches",
    firstJoin.email,
    existingEmail,
  );
  const duplicateJoinConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate owner registration is rejected",
    async () => {
      await authorize_owner_join(duplicateJoinConnection, {
        body: {
          email: existingEmail,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      });
    },
  );
  const freshEmail = typia.random<string & tags.Format<"email">>();
  const recoveredJoinConnection: api.IConnection = { host: connection.host };
  const recoveredJoin = await authorize_owner_join(recoveredJoinConnection, {
    body: {
      email: freshEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(recoveredJoin);
  TestValidator.equals(
    "later corrected registration succeeds with fresh email",
    recoveredJoin.email,
    freshEmail,
  );
  TestValidator.notEquals(
    "fresh email differs from duplicate-target email",
    recoveredJoin.email,
    existingEmail,
  );
  TestValidator.notEquals(
    "recovered registration creates a different owner account",
    recoveredJoin.id,
    firstJoin.id,
  );
}
