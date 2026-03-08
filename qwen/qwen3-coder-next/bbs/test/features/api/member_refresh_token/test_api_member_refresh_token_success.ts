import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardMember.IJoin;
  const registeredMember = await authorize_member_join(connection, {
    body: joinInput,
  });
  typia.assert(registeredMember);
  // 2. Login to obtain refresh token
  const loginInput: IDiscussionBoardMember.ILogin = {
    email: joinInput.email,
    password: joinInput.password,
  };
  const loggedMember = await authorize_member_login(connection, {
    body: loginInput,
  });
  typia.assert(loggedMember);
  // 3. Extract refresh token from authorized member
  const refreshToken = loggedMember.token.refresh;
  // 4. Call refresh endpoint with valid refresh token
  const refreshInput: IDiscussionBoardMember.IRefresh = {
    refresh_token: refreshToken,
  };
  const refreshedMember = await authorize_member_refresh(connection, {
    body: refreshInput,
  });
  typia.assert(refreshedMember);
  // 5. Verify refresh token response structure
  typia.assert(refreshedMember.token);
  // 6. Verify new tokens are generated (different from original)
  TestValidator.notEquals(
    "access token should be different after refresh",
    loggedMember.token.access,
    refreshedMember.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh",
    loggedMember.token.refresh,
    refreshedMember.token.refresh,
  );
  // 7. Verify token expiration metadata exists
  TestValidator.predicate(
    "expired_at should be valid date time",
    () => refreshedMember.token.expired_at !== null,
  );
  TestValidator.predicate(
    "refreshable_until should be valid date time",
    () => refreshedMember.token.refreshable_until !== null,
  );
  // 8. Verify member data is preserved
  TestValidator.equals(
    "member id should be same",
    loggedMember.id,
    refreshedMember.id,
  );
  TestValidator.equals(
    "email should be same",
    loggedMember.email,
    refreshedMember.email,
  );
  TestValidator.equals(
    "display_name should be same",
    loggedMember.display_name,
    refreshedMember.display_name,
  );
}
