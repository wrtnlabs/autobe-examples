import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that guest registration is rejected when using an email that already exists.
 *
 * Validates the platform-wide email uniqueness constraint:
 * 1. First registration with unique email succeeds
 * 2. Second registration with same email fails with 409 Conflict
 */
export async function test_api_guest_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique email for this test
  const email = typia.random<string & tags.Format<"email">>();
  // Step 1: First registration should succeed
  const firstConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_guest_join(firstConnection, {
    body: { email },
  });
  typia.assert(firstUser);
  // Step 2: Second registration with same email should fail with 409 Conflict
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate email registration should be rejected",
    409,
    async () => {
      await authorize_guest_join(secondConnection, {
        body: {
          email,
          displayName: RandomGenerator.name(),
          password: `Different1!${RandomGenerator.alphaNumeric(8)}`,
        },
      });
    },
  );
}
