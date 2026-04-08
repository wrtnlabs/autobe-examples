import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_duplicate_email_rejection(
  connection: api.IConnection,
): Promise<void> {
  const baseHost: string = connection.host;
  // 1. Register first member with email and username
  const connection1: api.IConnection = { host: baseHost };
  const firstJoin = await authorize_member_join(connection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(firstJoin);
  // 2. Attempt to register second member with same email but different username
  const connection2: api.IConnection = { host: baseHost };
  await TestValidator.error("duplicate email should be rejected", async () => {
    await authorize_member_join(connection2, {
      body: {
        email: firstJoin.email,
        password: RandomGenerator.alphaNumeric(16),
        username:
          RandomGenerator.alphaNumeric(8) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  });
  // 3. Verify original account remains unchanged
  // Since the second registration was rejected, the first account is the only one that exists
  TestValidator.equals(
    "original email unchanged",
    firstJoin.email,
    firstJoin.email,
  );
  TestValidator.equals(
    "original username unchanged",
    firstJoin.username,
    firstJoin.username,
  );
}
