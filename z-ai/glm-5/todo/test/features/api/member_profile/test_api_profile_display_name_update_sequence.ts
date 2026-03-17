import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_display_name_update_sequence(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. First update: set display_name to "First Name"
  const firstUpdate = await api.functional.privateTodoApp.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: "First Name",
      } satisfies IPrivateTodoAppMember.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  TestValidator.equals(
    "first display name",
    firstUpdate.displayName,
    "First Name",
  );
  const firstUpdatedAt = firstUpdate.updatedAt;
  // 3. Second update: change display_name to "Second Name"
  const secondUpdate =
    await api.functional.privateTodoApp.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: "Second Name",
        } satisfies IPrivateTodoAppMember.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  TestValidator.equals(
    "second display name",
    secondUpdate.displayName,
    "Second Name",
  );
  const secondUpdatedAt = secondUpdate.updatedAt;
  // 4. Third update: clear display_name (set to null)
  const thirdUpdate = await api.functional.privateTodoApp.member.profile.update(
    memberConnection,
    {
      body: { display_name: null } satisfies IPrivateTodoAppMember.IUpdate,
    },
  );
  typia.assert(thirdUpdate);
  TestValidator.equals(
    "third display name (null)",
    thirdUpdate.displayName,
    null,
  );
  const thirdUpdatedAt = thirdUpdate.updatedAt;
  // 5. Fourth update: set display_name to "Final Name"
  const fourthUpdate =
    await api.functional.privateTodoApp.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: "Final Name",
        } satisfies IPrivateTodoAppMember.IUpdate,
      },
    );
  typia.assert(fourthUpdate);
  TestValidator.equals(
    "fourth display name",
    fourthUpdate.displayName,
    "Final Name",
  );
  const fourthUpdatedAt = fourthUpdate.updatedAt;
  // 6. Verify timestamps are all different (each update should update the timestamp)
  TestValidator.notEquals(
    "first and second timestamps differ",
    firstUpdatedAt,
    secondUpdatedAt,
  );
  TestValidator.notEquals(
    "second and third timestamps differ",
    secondUpdatedAt,
    thirdUpdatedAt,
  );
  TestValidator.notEquals(
    "third and fourth timestamps differ",
    thirdUpdatedAt,
    fourthUpdatedAt,
  );
}
