import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_change_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account via authorization join
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const currentPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email,
      password: currentPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Prepare new password for change
  const newPassword = typia.random<
    string & tags.Format<"password"> & tags.MinLength<8>
  >();
  // 3. Change password using member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: joinResult.token.access,
  };
  const member =
    await api.functional.hrms.member.password_resets.changePassword(
      memberConnection,
      {
        body: {
          currentPassword,
          newPassword,
        } satisfies IHrmsMember.IChangePassword,
      },
    );
  typia.assert(member);
  // 4. Validate member profile in response
  TestValidator.equals("member id matches", member.id, joinResult.id);
  TestValidator.equals("email unchanged", member.email, joinResult.email);
  TestValidator.equals(
    "display_name unchanged",
    member.display_name,
    joinResult.display_name,
  );
  TestValidator.predicate(
    "has valid updated_at",
    member.updated_at !== undefined,
  );
  // 5. Verify new password works for authentication
  const newLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(newLoginConnection, {
    body: {
      email,
      password: newPassword,
    },
  });
  // 6. Verify old password no longer works
  const oldLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old password should not work", async () => {
    await authorize_member_login(oldLoginConnection, {
      body: {
        email,
        password: currentPassword,
      },
    });
  });
}