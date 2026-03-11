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

export async function test_api_member_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member to establish session
  const memberConnection: api.IConnection = { host: connection.host };
  const memberSession = await authorize_member_join(memberConnection, {
    body: {
      email: (typia.random<string>() as string) satisfies string & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: (typia.random<string>() as string) satisfies string & tags.Format<"uri">,
      referrer: (typia.random<string>() as string) satisfies string & tags.Format<"uri">,
    } satisfies ITodoAppMemberSession.IJoin,
  });
  // Step 2: Update own profile display name
  const profileId = memberSession.member.id;
  const newDisplayName = RandomGenerator.name();
  const updatedProfile =
    await api.functional.todoApp.member.profile.patchByProfileid(
      memberConnection,
      {
        profileId,
        body: {
          display_name: newDisplayName,
        } satisfies ITodoAppProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Step 3: Validate response
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.predicate(
    "created_at exists",
    new Date(updatedProfile.created_at) instanceof Date,
  );
  TestValidator.predicate(
    "updated_at exists and is recent",
    new Date(updatedProfile.updated_at) > new Date(updatedProfile.created_at),
  );
}