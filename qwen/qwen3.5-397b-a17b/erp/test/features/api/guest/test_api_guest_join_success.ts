import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
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
  // Create guest connection for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // Register new guest with unique device fingerprint
  const output: IHrmPlatformGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmPlatformGuest.IJoin,
    },
  );
  // Validate response structure and types
  typia.assert(output);
  // Business logic validation: refresh token expiration should be after access token expiration
  TestValidator.predicate(
    "refresh expires after access",
    new Date(output.token.refreshable_until) >=
      new Date(output.token.expired_at),
  );
  // Verify guest connection was updated with authorization token by utility function
  TestValidator.predicate(
    "guest connection has authorization header",
    guestConnection.headers?.Authorization !== undefined,
  );
}
