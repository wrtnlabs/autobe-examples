import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member using utility function
  const registerConnection: api.IConnection = { host: connection.host };
  const memberSession = await authorize_member_join(registerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(memberSession);
  // Step 2: Login with the new member credentials using utility function
  const loginConnection: api.IConnection = { host: connection.host };
  const authSession = await authorize_member_login(loginConnection, {
    body: {
      email: (memberSession as any).email,
      password: RandomGenerator.alphaNumeric(16),
      href: "",
      referrer: "",
    } satisfies ITodoAppMemberSession.ILogin,
  });
  typia.assert(authSession);
  // Step 3: Test successful display name update
  const newDisplayName = "John Doe";
  const updateConnection: api.IConnection = { host: connection.host };
  const updatedProfile = await api.functional.todoApp.member.profile.patch(
    updateConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppProfile.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // Step 4: Verify the updated profile
  TestValidator.equals(
    "display name matches",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.predicate(
    "updated_at is not null",
    updatedProfile.updated_at !== null,
  );
  // Step 5: Test display name at exactly 100 characters limit
  const longDisplayName = RandomGenerator.alphabets(100);
  const updatedProfileLong = await api.functional.todoApp.member.profile.patch(
    updateConnection,
    {
      body: {
        display_name: longDisplayName,
      } satisfies ITodoAppProfile.IUpdate,
    },
  );
  typia.assert(updatedProfileLong);
  TestValidator.equals(
    "100 char display name matches",
    updatedProfileLong.display_name,
    longDisplayName,
  );
  // Step 6: Test invalid display name scenarios
  // Empty string
  await TestValidator.error("empty display name rejected", async () => {
    await api.functional.todoApp.member.profile.patch(updateConnection, {
      body: { display_name: "" } satisfies ITodoAppProfile.IUpdate,
    });
  });
  // Whitespace only
  await TestValidator.error(
    "whitespace-only display name rejected",
    async () => {
      await api.functional.todoApp.member.profile.patch(updateConnection, {
        body: { display_name: "   " } satisfies ITodoAppProfile.IUpdate,
      });
    },
  );
  // Over 100 characters
  const over100Chars = RandomGenerator.alphabets(101);
  await TestValidator.error("over 100 chars rejected", async () => {
    await api.functional.todoApp.member.profile.patch(updateConnection, {
      body: { display_name: over100Chars } satisfies ITodoAppProfile.IUpdate,
    });
  });
}