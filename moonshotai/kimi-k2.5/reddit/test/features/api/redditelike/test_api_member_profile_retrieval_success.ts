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

export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a test member account to get a valid memberId
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorizedMember);
  // 2. Create a fresh connection as a guest to test public access
  const guestConnection: api.IConnection = { host: connection.host };
  // 3. Retrieve the member's public profile
  const profile = await api.functional.redditLike.members.at(guestConnection, {
    memberId: authorizedMember.id,
  });
  typia.assert(profile);
  // 4. Validate the profile contains the expected public fields with correct values
  TestValidator.equals("member id matches", profile.id, authorizedMember.id);
  TestValidator.equals(
    "username matches",
    profile.username,
    authorizedMember.username,
  );
}
