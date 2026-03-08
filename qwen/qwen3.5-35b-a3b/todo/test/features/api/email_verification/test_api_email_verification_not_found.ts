import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const authorizedMember: ITodoAppMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(authorizedMember);
  // 2. Generate random UUID that doesn't exist
  const nonExistentVerificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. joinConnection is already authorized with the token from authorize_member_join
  // Use it directly for the member API call
  // 4. Attempt to retrieve non-existent verification token
  // This should return 404 Not Found
  await TestValidator.httpError(
    "non-existent verification returns 404",
    404,
    async () => {
      await api.functional.todoApp.member.email_verifications.at(
        joinConnection,
        {
          verificationId: nonExistentVerificationId,
        },
      );
    },
  );
}
