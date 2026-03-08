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

export async function test_api_profile_display_name_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // Store original profile data for comparison
  const originalId = authResult.id;
  const originalEmail = authResult.email;
  const originalDisplayName = authResult.displayName;
  const originalCreatedAt = authResult.createdAt;
  // 2. Prepare update request with new display name
  const newDisplayName = "Updated Display Name";
  const updateBody = {
    displayName: newDisplayName,
  } satisfies ITodoAppMember.IUpdate;
  // 3. Submit PUT request to update profile
  const updatedProfile = await api.functional.todoApp.member.profile.update(
    memberConnection,
    { body: updateBody },
  );
  typia.assert(updatedProfile);
  // 4. Validate the response contains correct updated profile
  TestValidator.equals("member id unchanged", updatedProfile.id, originalId);
  TestValidator.equals("email unchanged", updatedProfile.email, originalEmail);
  TestValidator.equals(
    "display name updated",
    updatedProfile.displayName,
    newDisplayName,
  );
  TestValidator.notEquals(
    "display name changed from original",
    updatedProfile.displayName,
    originalDisplayName,
  );
  TestValidator.equals(
    "created at unchanged",
    updatedProfile.createdAt,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated at newer than created at",
    new Date(updatedProfile.updatedAt).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
}
