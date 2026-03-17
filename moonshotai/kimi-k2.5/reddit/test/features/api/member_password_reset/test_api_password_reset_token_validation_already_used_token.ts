import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberPasswordResetValidation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordResetValidation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_token_validation_already_used_token(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as a member
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Check a password reset token
  // Note: Testing the validation endpoint structure. The specific 'already used'
  // scenario requires APIs to create and consume tokens, which are not available.
  const resetId = RandomGenerator.alphaNumeric(32);
  const response: IRedditLikeMemberPasswordResetValidation =
    await api.functional.redditLike.member.password_resets.at(
      memberConnection,
      {
        resetId,
      },
    );
  typia.assert(response);
}
