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

export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member account for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: IDiscussionBoardMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    passwordConfirmation: RandomGenerator.alphaNumeric(16),
  };
  const authorized: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: memberData,
    });
  typia.assert(authorized);
  // Extract refresh token and member ID from authorized response
  const refreshToken: string = authorized.refresh_token;
  const memberId: string = authorized.id;
  // Create fresh connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Test token refresh with valid refresh token
  const refreshed: IDiscussionBoardMember.IAuthorized =
    await api.functional.discussionBoard.auth.member.refresh(
      refreshConnection,
      {
        body: {
          refreshToken,
          memberId,
        } satisfies IDiscussionBoardMember.IRefresh,
      },
    );
  typia.assert(refreshed);
  // Verify new access token was issued
  TestValidator.equals(
    "new access token generated",
    typeof refreshed.access_token,
    "string",
  );
  TestValidator.predicate(
    "member ID preserved",
    refreshed.member.id === memberId,
  );
}
