import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_maximum_display_name_length(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and join with 100-character display name
  const memberConnection: api.IConnection = { host: connection.host };
  const displayName: string = RandomGenerator.alphabets(100);
  TestValidator.equals("display name length", displayName.length, 100);
  const authResult: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: displayName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(authResult);
  // 2. Update profile with the same 100-character display name
  const updatedProfile: ITodoAppMember =
    await api.functional.todoApp.member.profile.update(memberConnection, {
      body: {
        display_name: displayName,
      } satisfies ITodoAppMember.IUpdate,
    });
  typia.assert(updatedProfile);
  // 3. Verify the display name is exactly 100 characters with no truncation
  TestValidator.equals(
    "display name length after update",
    updatedProfile.displayName.length,
    100,
  );
  TestValidator.equals(
    "display name matches input",
    updatedProfile.displayName,
    displayName,
  );
  // 4. Verify account is still active (deleted_at is null)
  TestValidator.equals("account is active", updatedProfile.deletedAt, null);
}
