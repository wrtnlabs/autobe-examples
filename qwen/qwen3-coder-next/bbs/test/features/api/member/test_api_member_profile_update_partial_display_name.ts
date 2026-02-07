import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_partial_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const registerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(registerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create a new connection with the authorization token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joinResult.token.access,
    },
  };
  // 3. Get initial profile to capture existing bio value
  const profileBefore = await api.functional.discussionBoard.members.update(
    memberConnection,
    {
      body: {
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.IUpdate,
    },
  );
  typia.assert(profileBefore);
  // 4. Update only display_name with new value
  const displayNameValue = RandomGenerator.name();
  const updatedProfile = await api.functional.discussionBoard.members.update(
    memberConnection,
    {
      body: {
        display_name: displayNameValue,
      } satisfies IDiscussionBoardMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 5. Verify the response contains the updated display_name
  TestValidator.equals(
    "display_name updated",
    (updatedProfile as any).display_name,
    displayNameValue,
  );
}
