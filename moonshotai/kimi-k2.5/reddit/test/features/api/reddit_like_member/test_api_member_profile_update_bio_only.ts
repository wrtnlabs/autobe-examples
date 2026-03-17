import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_bio_only(
  connection: api.IConnection,
) {
  // 1. Join as a new member to create an authenticated session
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Prepare new username for partial update test
  const newUsername = RandomGenerator.name(1);
  // 3. Update profile with only the username field (partial update pattern)
  const updatedProfile = await api.functional.redditLike.member.profile.update(
    memberConnection,
    {
      body: {
        username: newUsername,
      } satisfies IRedditLikeMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
}
