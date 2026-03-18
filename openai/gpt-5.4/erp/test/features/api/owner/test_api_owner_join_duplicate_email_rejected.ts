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

export async function test_api_owner_join_duplicate_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  const normalizedSeed = RandomGenerator.alphabets(10);
  const baseEmail = `${normalizedSeed}@example.com`;
  const duplicateEmail = `${normalizedSeed.toUpperCase()}@EXAMPLE.COM`;
  const firstBody = {
    email: baseEmail satisfies string as string & tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16) satisfies string as string &
      tags.Format<"password">,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingOwner.IJoin;
  const secondBody = {
    email: duplicateEmail satisfies string as string & tags.Format<"email">,
    password: firstBody.password,
    href: firstBody.href,
    referrer: firstBody.referrer,
    ip: firstBody.ip,
  } satisfies IHrmTimeTrackingOwner.IJoin;
  const firstConnection: api.IConnection = { host: connection.host };
  const firstJoin: IHrmTimeTrackingOwner.IAuthorized =
    await authorize_owner_join(firstConnection, {
      body: firstBody,
    });
  typia.assert(firstJoin);
  TestValidator.equals(
    "first owner email matches logical identity",
    firstJoin.email.toLowerCase(),
    baseEmail.toLowerCase(),
  );
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate owner email is rejected after normalization",
    async () => {
      try {
        await authorize_owner_join(secondConnection, {
          body: secondBody,
        });
      } catch (exp) {
        const content = exp instanceof Error ? exp.message : String(exp);
        TestValidator.predicate(
          "duplicate failure does not leak plaintext password",
          content.includes(firstBody.password) === false,
        );
        throw exp;
      }
    },
  );
  TestValidator.equals(
    "duplicate attempt does not authenticate second connection",
    secondConnection.headers?.Authorization,
    undefined,
  );
  TestValidator.equals(
    "first authenticated connection remains intact",
    firstConnection.headers?.Authorization,
    firstJoin.token.access,
  );
}
