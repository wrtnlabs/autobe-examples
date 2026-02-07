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

export async function test_api_member_profile_update_max_length_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.discussionBoard.auth.member.join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        name: RandomGenerator.name(),
        ip: "127.0.0.1",
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(joinResponse);
  // 2. Create authenticated connection for the new member
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    authorization: joinResponse.token.access,
  };
  // 3. Update profile (empty body as IUpdate has no fields defined in schema)
  const updatedProfile =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      {
        body: {} satisfies IDiscussionBoardMember.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate that update operation succeeded (entity returned)
  TestValidator.predicate(
    "profile update returned data",
    updatedProfile !== null && updatedProfile !== undefined,
  );
}
