import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_duplicate_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique email to reuse across both registration attempts
  const sharedEmail = typia.random<string & tags.Format<"email">>();
  // 1. First registration — should succeed
  const firstConnection: api.IConnection = { host: connection.host };
  const firstResult = await authorize_member_join(firstConnection, {
    body: {
      email: sharedEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstResult);
  // Validate the first member's email matches what was provided
  TestValidator.equals(
    "first member email matches input",
    firstResult.email,
    sharedEmail,
  );
  // 2. Second registration with the same email — should fail with conflict error
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await authorize_member_join(secondConnection, {
        body: {
          email: sharedEmail,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      });
    },
  );
}
