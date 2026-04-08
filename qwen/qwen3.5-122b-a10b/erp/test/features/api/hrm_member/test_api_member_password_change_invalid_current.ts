import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test password change rejection with invalid current password.
 *
 * Validates that the password change endpoint properly authenticates the current password before allowing updates. When a member attempts to change their password with an incorrect current password value, the system must reject the request with a 401 Unauthorized error, preventing unauthorized password modifications.
 *
 * This test ensures that password security is maintained by requiring proper verification of existing credentials before accepting new password values.
 *
 * 1. Create a new member account with known email and password credentials.
 * 2. Attempt to update the password using an incorrect current_password value.
 * 3. Validate that the API returns 401 Unauthorized error.
 * 4. Confirm the member's password remains unchanged after failed attempt.
 */
export async function test_api_member_password_change_invalid_current(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with known password
  const memberConnection: api.IConnection = { host: connection.host };
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const joinOutput: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: originalPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(joinOutput);
  // 2. Attempt password change with incorrect current password
  const wrongCurrentPassword = RandomGenerator.alphaNumeric(16);
  const newPassword = RandomGenerator.alphaNumeric(16);
  await TestValidator.httpError(
    "password change rejected with invalid current password",
    401,
    async () => {
      await api.functional.hrm.member.profile.password.update(
        memberConnection,
        {
          body: {
            current_password: wrongCurrentPassword,
            new_password: newPassword,
          } satisfies IHrmMember.IPasswordUpdate,
        },
      );
    },
  );
}
