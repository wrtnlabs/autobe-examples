import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_empty_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with valid initial display name
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IMultiUserTodoAppMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies DeepPartial<IMultiUserTodoAppMember.IJoin>,
    });
  typia.assert(member);
  // 2. Capture original display name before update attempt
  const originalDisplayName: string = member.displayName;
  // 3. Create authorized connection for member profile operations
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${member.token.access}`,
    },
  };
  // 4. Send update request with empty displayName and verify it's rejected
  await TestValidator.error("reject empty displayName update", async () => {
    await api.functional.multiUserTodoApp.member.profile.update(
      authorizedConnection,
      {
        body: {} as const,
      },
    );
  });
  // 5. Verify the member profile still has original display name
  const updatedMember: IMultiUserTodoAppMember =
    await api.functional.multiUserTodoApp.member.profile.update(
      authorizedConnection,
      {
        body: {} as const,
      },
    );
  typia.assert(updatedMember);
  TestValidator.equals(
    "display name unchanged after failed update",
    updatedMember.displayName,
    originalDisplayName,
  );
}
