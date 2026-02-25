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

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate random valid registration data
  const password = RandomGenerator.alphaNumeric(16);
  const body: IDiscussionBoardMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: password,
    displayName: RandomGenerator.name(),
    passwordConfirmation: password,
  };
  // Execute registration
  const result = await api.functional.discussionBoard.auth.member.join(
    connection,
    { body },
  );
  typia.assert(result);
  // Verify member profile
  TestValidator.equals("member email matches", result.member.email, body.email);
  TestValidator.equals(
    "member display name matches",
    result.member.display_name,
    body.displayName,
  );
  TestValidator.equals("member is active", result.member.is_active, true);
  // Verify tokens
  TestValidator.predicate(
    "access token exists",
    result.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    result.refresh_token.length > 0,
  );
  TestValidator.predicate(
    "token access exists",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh exists",
    result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at exists",
    result.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "token refreshable_until exists",
    result.token.refreshable_until !== undefined,
  );
}
