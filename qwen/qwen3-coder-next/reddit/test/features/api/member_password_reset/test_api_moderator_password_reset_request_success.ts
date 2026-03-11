import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_password_reset_request_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account first to ensure email exists
  const memberJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
  } satisfies IRedditLikeMember.IJoin;
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: memberJoinInput,
    },
  );
  typia.assert(member);
  // 2. Join and authenticate as moderator
  const moderatorJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(),
  } satisfies IRedditLikeModerator.IJoin;
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await api.functional.redditLike.auth.moderator.join(
    moderatorConnection,
    {
      body: moderatorJoinInput,
    },
  );
  typia.assert(moderator);
  // 3. Authenticate as moderator
  const moderatorLoginInput: IRedditLikeModerator.ILogin = {
    email: moderator.email,
    password: moderatorJoinInput.password,
  };
  const moderatorAuthConnection: api.IConnection = { host: connection.host };
  await api.functional.redditLike.auth.moderator.login(
    moderatorAuthConnection,
    {
      body: moderatorLoginInput,
    },
  );
  // 4. Send password reset request as moderator
  const passwordResetInput: IRedditLikeMemberPasswordReset.IRequest = {
    email: member.email,
  };
  const result =
    await api.functional.redditLike.moderator.password_resets.create(
      moderatorAuthConnection,
      {
        body: passwordResetInput,
      },
    );
  typia.assert(result);
  // 5. Verify response contains success message
  TestValidator.equals(
    "success message",
    result.message,
    "Password reset request processed successfully",
  );
}
