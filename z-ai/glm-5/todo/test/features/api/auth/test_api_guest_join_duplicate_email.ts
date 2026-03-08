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

export async function test_api_guest_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate a specific email for testing duplicate registration
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Step 1: Create first connection and register with the specific email
  const firstConnection: api.IConnection = { host: connection.host };
  const firstRegistration = await authorize_guest_join(firstConnection, {
    body: {
      email: duplicateEmail,
      password: password,
      href: href,
      referrer: referrer,
    },
  });
  typia.assert(firstRegistration);
  // Step 2: Attempt to register with the same email address
  // This should fail due to duplicate email constraint
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "should reject duplicate email registration",
    async () => {
      await authorize_guest_join(secondConnection, {
        body: {
          email: duplicateEmail,
          password: password,
          href: href,
          referrer: referrer,
        },
      });
    },
  );
}
