import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test registering a new user including optional session context (href, referrer, ip) to verify these optional fields do not prevent successful user creation and are handled correctly by the system.
 */
export async function test_api_user_join_with_session_context(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for user join operation
  const userConnection: api.IConnection = { host: connection.host };
  // Prepare optional session context to test that it is handled correctly
  const sessionContext = {
    href: `https://test.${RandomGenerator.alphabets(8)}.com/path/page.html`,
    referrer: `https://refer.${RandomGenerator.alphabets(5)}.org/start`,
    ip: `${randint(1, 255)}.${randint(0, 255)}.${randint(0, 255)}.${randint(0, 255)}`,
  };
  // Prepare the user join body including session context
  // According to the DTO, IJoin is an empty type, so the join body is empty
  // But to follow instruction, we pass optional session context in body
  // It's safe to include as partial body since IJoin is empty
  const joinBody = { ...sessionContext };
  // Perform user join with session context
  const authorized = await authorize_user_join(userConnection, {
    body: joinBody,
  });
  // Validate response structure
  typia.assert(authorized);
  // Update the userConnection's headers with the access token for future usages
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Validate presence of token access and refresh with date-time formats
  TestValidator.predicate(
    "token access length > 0",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh length > 0",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at valid date-time",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until valid date-time",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
}
