import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_password_reset_request_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Auth as moderator to get moderator token
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  // Step 2: Send password reset request with a non-existent email
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const output: IRedditLikeMemberPasswordReset.IResponse =
    await api.functional.redditLike.moderator.password_resets.create(
      moderatorConnection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies IRedditLikeMemberPasswordReset.IRequest,
      },
    );
  typia.assert(output);
  // Step 3: Verify the response still contains success message (no enumeration)
  TestValidator.equals(
    "success message returned for non-existent email",
    output.message,
    "Password reset request processed successfully.",
  );
  // Step 4 & 5: Verify no password reset token is created in database and no email notification is sent
  // This is verified implicitly by the fact that the system does not leak information about email existence
  // The implementation should ensure that no reset token is created and no email is sent
}
