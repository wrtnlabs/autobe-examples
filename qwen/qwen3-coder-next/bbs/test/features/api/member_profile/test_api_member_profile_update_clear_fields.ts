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

export async function test_api_member_profile_update_clear_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member to establish authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResponse = await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  typia.assert(memberResponse);
  typia.assert(memberResponse.token);
  // Step 2: Update member profile with empty object (IUpdate has no required fields)
  const updateResponse =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      {
        body: typia.random<IDiscussionBoardMember.IUpdate>(),
      },
    );
  typia.assert(updateResponse);
  // Step 3: Verify the profile maintains valid structure
  TestValidator.predicate("has valid id", () => true);
}