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

export async function test_api_member_profile_update_over_length_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Register a new member
  const registered = await authorize_member_join(memberConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: "Password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(registered);
  // Create new connection with the obtained access token
  const authConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: registered.token.access },
  };
  // 1. Update profile with valid short name first
  const validUpdate = await api.functional.todoApp.member.profile.put(
    authConnection,
    {
      body: {
        display_name: RandomGenerator.name(3), // Valid short name
      } satisfies ITodoAppProfile.IUpdate,
    },
  );
  typia.assert(validUpdate);
  // 2. Attempt to update with display name exceeding 100 characters
  const tooLongName = RandomGenerator.paragraph({
    sentences: 20,
    wordMin: 15,
    wordMax: 30,
  }); // ~400+ characters
  // Should fail with validation error
  await TestValidator.error(
    "should reject display name over 100 characters",
    async () => {
      await api.functional.todoApp.member.profile.put(authConnection, {
        body: {
          display_name: tooLongName,
        },
      });
    },
  );
}