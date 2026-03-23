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

export async function test_api_member_profile_rapid_update_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: ITodoAppMemberSession.IJoin = {
    email: (typia.random<string & tags.Format<"email">>() satisfies string as string) satisfies string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email"> as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const authResponse = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(authResponse);
  // Create a separate connection with the authentication token
  const profileConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...memberConnection.headers,
    },
  };
  // Step 2: Submit two rapid profile updates with different display names
  const firstUpdate: ITodoAppProfile.IUpdate = {
    display_name: RandomGenerator.name(),
  };
  const secondUpdate: ITodoAppProfile.IUpdate = {
    display_name: RandomGenerator.name(),
  };
  // First update
  const firstResult =
    await api.functional.todoApp.member.profile.patchByProfileid(
      profileConnection,
      {
        profileId: authResponse.member.id,
        body: firstUpdate,
      },
    );
  typia.assert(firstResult);
  // Second update (rapid succession)
  const secondResult =
    await api.functional.todoApp.member.profile.patchByProfileid(
      profileConnection,
      {
        profileId: authResponse.member.id,
        body: secondUpdate,
      },
    );
  typia.assert(secondResult);
  // Step 3: Verify the final profile reflects the second update
  // Re-fetch the profile to verify persistence
  const finalProfile =
    await api.functional.todoApp.member.profile.patchByProfileid(
      profileConnection,
      {
        profileId: authResponse.member.id,
        body: secondUpdate,
      },
    );
  typia.assert(finalProfile);
  TestValidator.equals(
    "final display name matches second update",
    finalProfile.display_name,
    secondUpdate.display_name,
  );
}