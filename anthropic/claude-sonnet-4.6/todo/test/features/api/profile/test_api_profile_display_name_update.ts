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

export async function test_api_profile_display_name_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and obtain authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // Capture member id and initial profile info
  const memberId = authorized.id;
  // Step 2: Update the display name via PUT /todoApp/member/profile
  const newDisplayName = "Jane Doe";
  const updatedProfile = await api.functional.todoApp.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: newDisplayName,
      } satisfies ITodoAppUserProfile.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // Step 3: Validate business logic
  TestValidator.equals(
    "displayName matches submitted value",
    updatedProfile.displayName,
    newDisplayName,
  );
  TestValidator.equals(
    "memberId matches registered member",
    updatedProfile.memberId,
    memberId,
  );
  TestValidator.predicate(
    "updatedAt is >= createdAt (timestamp refreshed)",
    new Date(updatedProfile.updatedAt) >= new Date(updatedProfile.createdAt),
  );
}
