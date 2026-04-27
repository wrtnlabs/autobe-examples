import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_change_with_incorrect_current_password(
  connection: api.IConnection,
): Promise<void> {
  // Register a member with a known password
  const password = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      password,
    },
  });
  typia.assert(member);
  // Attempt to change password with incorrect current password → must throw 400
  await TestValidator.httpError(
    "should reject incorrect current password with 400",
    400,
    () =>
      api.functional.communityPlatform.member.password.change(
        memberConnection,
        {
          body: {
            currentPassword: "wrong_current_pass_123",
            newPassword: typia.random<string & tags.Format<"password">>(),
          } satisfies ICommunityPlatformMember.IChangePassword,
        },
      ),
  );
}
