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

export async function test_api_profile_display_name_successive_updates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and obtain JWT session (sets Authorization header on memberConnection)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. First update: set displayName to "Initial Name"
  const firstUpdate = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: "Initial Name",
      } satisfies ITodoAppUserProfile.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // Validate displayName was set correctly
  TestValidator.equals(
    "first displayName",
    firstUpdate.displayName,
    "Initial Name",
  );
  // Record identity and timestamp from first update
  const firstUpdatedAt = firstUpdate.updatedAt;
  const profileId = firstUpdate.id;
  const profileMemberId = firstUpdate.memberId;
  // 3. Second update: set displayName to "Updated Name"
  const secondUpdate = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: "Updated Name",
      } satisfies ITodoAppUserProfile.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // Validate displayName was replaced correctly
  TestValidator.equals(
    "second displayName",
    secondUpdate.displayName,
    "Updated Name",
  );
  // 4. Assert updatedAt of second update >= first update (timestamp advanced or equal)
  TestValidator.predicate(
    "updatedAt advances or stays equal on second update",
    new Date(secondUpdate.updatedAt).getTime() >=
      new Date(firstUpdatedAt).getTime(),
  );
  // 5. Assert profile identity is stable across both updates
  TestValidator.equals("profile id stable", secondUpdate.id, profileId);
  TestValidator.equals(
    "profile memberId stable",
    secondUpdate.memberId,
    profileMemberId,
  );
}
