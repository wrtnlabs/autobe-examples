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

export async function test_api_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration with initial display name
  const joinConnection: api.IConnection = { host: connection.host };
  const member: ITodoAppMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create authenticated connection using the token from registration
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: member.token.access,
  };
  // 3. Generate new display name for update
  const newDisplayName = RandomGenerator.name();
  // 4. Update profile display name
  const updatedProfile: ITodoAppUserProfile =
    await api.functional.todoApp.member.profile.update(memberConnection, {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppUserProfile.IUpdate,
    });
  typia.assert(updatedProfile);
  // 5. Validate display name was updated correctly
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  // 6. Validate lastDisplayNameChange timestamp was set
  TestValidator.predicate(
    "last display name change timestamp exists",
    updatedProfile.lastDisplayNameChange !== null,
  );
  // 7. Validate timestamp is recent (within last 30 seconds to account for clock skew)
  const updateTime = new Date(updatedProfile.lastDisplayNameChange!);
  const now = new Date();
  const diffMs = now.getTime() - updateTime.getTime();
  const diffSeconds = diffMs / 1000;
  TestValidator.predicate(
    "timestamp is recent",
    diffSeconds >= 0 && diffSeconds <= 30,
  );
  // 8. Validate other profile fields are preserved and valid
  TestValidator.predicate(
    "profile has valid uuid id",
    typia.is<string & tags.Format<"uuid">>(updatedProfile.id),
  );
  TestValidator.predicate(
    "profile has valid created_at timestamp",
    typia.is<string & tags.Format<"date-time">>(updatedProfile.createdAt),
  );
  TestValidator.predicate(
    "profile has valid updated_at timestamp",
    typia.is<string & tags.Format<"date-time">>(updatedProfile.updatedAt),
  );
}
