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

export async function test_api_member_profile_display_name_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // 2. Generate new display name for update
  const newDisplayName: string = RandomGenerator.name();
  // 3. Update profile with new display name
  const updatedProfile: ITodoAppMember =
    await api.functional.todoApp.member.profile.update(memberConnection, {
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppMember.IUpdate,
    });
  typia.assert(updatedProfile);
  // 4. Validate the update results
  TestValidator.equals(
    "display_name matches update request",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals("id unchanged", updatedProfile.id, memberAuth.id);
  TestValidator.equals(
    "email unchanged",
    updatedProfile.email,
    memberAuth.email,
  );
  // 5. Verify updated_at is later than created_at
  const createdAt: Date = new Date(memberAuth.created_at);
  const updatedAt: Date = new Date(updatedProfile.updated_at);
  TestValidator.predicate(
    "updated_at is later than created_at",
    updatedAt > createdAt,
  );
  // 6. Verify updated_at changed from original
  const originalUpdatedAt: Date = new Date(memberAuth.updated_at);
  TestValidator.predicate(
    "updated_at was refreshed",
    updatedAt > originalUpdatedAt,
  );
}
