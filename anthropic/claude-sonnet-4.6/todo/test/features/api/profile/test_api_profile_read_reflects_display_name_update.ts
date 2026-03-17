import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_read_reflects_display_name_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // Step 2: Record initial profile data from join response
  const initialProfile = authorized.profile;
  // Step 3: Generate a new display name
  const newDisplayName = RandomGenerator.paragraph({ sentences: 2 });
  // Step 4: Update the member's display name
  const updatedProfile = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: newDisplayName,
      } satisfies ITodoAppUserProfile.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // Step 5: Call GET /todoApp/member/profile with the same authenticated connection
  const fetchedProfile =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(fetchedProfile);
  // Step 7: Verify the returned displayName exactly matches the new display name
  TestValidator.equals(
    "displayName matches updated value",
    fetchedProfile.displayName,
    newDisplayName,
  );
  // Step 8: Verify updatedAt > createdAt (profile was modified)
  TestValidator.predicate(
    "updatedAt is strictly greater than createdAt",
    new Date(fetchedProfile.updatedAt) > new Date(fetchedProfile.createdAt),
  );
  // Step 9: Verify id and memberId remain unchanged
  TestValidator.equals(
    "profile id unchanged",
    fetchedProfile.id,
    initialProfile.id,
  );
  TestValidator.equals(
    "memberId unchanged",
    fetchedProfile.memberId,
    initialProfile.memberId,
  );
}
