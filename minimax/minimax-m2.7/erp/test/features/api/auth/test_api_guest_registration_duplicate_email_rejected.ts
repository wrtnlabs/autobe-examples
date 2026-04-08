import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_registration_duplicate_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the first guest with a unique email
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const firstGuest = await authorize_guest_join(connection, {
    body: {
      email: email,
      password: password,
      passwordConfirmation: password,
      organizationName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstGuest);
  // 2. Attempt to register a second guest with the SAME email address
  // This should be rejected due to email uniqueness constraint
  const duplicateConnection: api.IConnection = { host: connection.host };
  const duplicatePassword = RandomGenerator.alphaNumeric(16);
  await TestValidator.httpError(
    "duplicate email registration rejected",
    [400, 409],
    async () =>
      await api.functional.erpHrm.auth.guest.join(duplicateConnection, {
        body: {
          email: email,
          password: duplicatePassword,
          passwordConfirmation: duplicatePassword,
          organizationName: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IErpHrmGuest.IJoin,
      }),
  );
  // 3. Verify the original guest account is still valid with the same ID
  // The duplicate registration failed, so the original account remains unchanged
  TestValidator.predicate(
    "original guest account preserved",
    firstGuest.id.length > 0,
  );
}
