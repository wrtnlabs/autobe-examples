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

export async function test_api_profile_display_name_multiple_updates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account via join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  const memberId = authResult.id;
  const memberEmail = authResult.email;
  // 2. First update - 'First Update'
  const profile1 = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: { displayName: "First Update" } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(profile1);
  TestValidator.equals(
    "first update - display name",
    profile1.displayName,
    "First Update",
  );
  TestValidator.equals(
    "first update - member id unchanged",
    profile1.id,
    memberId,
  );
  TestValidator.equals(
    "first update - email unchanged",
    profile1.email,
    memberEmail,
  );
  // 3. Second update - 'Second Update'
  const profile2 = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: { displayName: "Second Update" } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(profile2);
  TestValidator.equals(
    "second update - display name",
    profile2.displayName,
    "Second Update",
  );
  TestValidator.equals(
    "second update - member id unchanged",
    profile2.id,
    memberId,
  );
  TestValidator.equals(
    "second update - email unchanged",
    profile2.email,
    memberEmail,
  );
  // 4. Third update - 'Third Update'
  const profile3 = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: { displayName: "Third Update" } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(profile3);
  TestValidator.equals(
    "third update - display name",
    profile3.displayName,
    "Third Update",
  );
  TestValidator.equals(
    "third update - member id unchanged",
    profile3.id,
    memberId,
  );
  TestValidator.equals(
    "third update - email unchanged",
    profile3.email,
    memberEmail,
  );
}
