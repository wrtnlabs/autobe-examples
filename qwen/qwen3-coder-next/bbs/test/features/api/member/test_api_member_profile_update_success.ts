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

export async function test_api_member_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const registerConnection: api.IConnection = { host: connection.host };
  const registered = await api.functional.discussionBoard.auth.member.join(
    registerConnection,
    {
      body: {
        // IDiscussionBoardMember.IJoin has no required fields currently
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(registered);
  // Update connection with authorization token
  registerConnection.headers = {
    Authorization: registered.token.access,
  };
  // 2. Update member profile with valid display_name and bio
  const updated = await api.functional.discussionBoard.members.update(
    registerConnection,
    {
      body: {
        // IDiscussionBoardMember.IUpdate has no required fields currently
      } satisfies IDiscussionBoardMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 3. Verify the response contains the updated profile information
  // IDiscussionBoardMember has no fields currently, so just validate structure
}
