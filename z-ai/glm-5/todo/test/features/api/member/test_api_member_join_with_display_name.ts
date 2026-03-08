import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member registration when a custom display name is provided.
 *
 * 1. Prepare a custom display name for the registration request
 * 2. Call the join API with the custom display name
 * 3. Validate the response structure
 * 4. Verify the display name in the response matches exactly
 */
export async function test_api_member_join_with_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Prepare a custom display name
  const customDisplayName = RandomGenerator.name();
  // Call join API with custom display name (utility generates other fields)
  const result = await authorize_member_join(connection, {
    body: {
      displayName: customDisplayName,
    },
  });
  // Validate response structure
  typia.assert(result);
  // Verify the display name is preserved exactly as submitted
  TestValidator.equals(
    "display name matches",
    result.displayName,
    customDisplayName,
  );
}
