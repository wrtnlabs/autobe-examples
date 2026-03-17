import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_device_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account to establish initial session with known device fingerprint
  const initialConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(initialConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoAppMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Extract refresh token from initial response
  const refreshToken = member.token.refresh;
  // Step 3: Create new connection (simulating different device/client)
  const differentDeviceConnection: api.IConnection = { host: connection.host };
  // Step 4: Attempt to refresh using the same refresh token from different device
  // This should fail with 401 Unauthorized due to device fingerprint mismatch
  await TestValidator.error(
    "should reject refresh with device mismatch",
    async () => {
      await authorize_member_refresh(differentDeviceConnection, {
        body: {
          refresh_token: refreshToken,
        } satisfies IMultiUserTodoAppMember.IRefresh,
      });
    },
  );
}
