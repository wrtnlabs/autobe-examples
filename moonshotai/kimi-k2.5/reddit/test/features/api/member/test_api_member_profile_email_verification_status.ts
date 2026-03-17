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

export async function test_api_member_profile_email_verification_status(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1) Create a new member account - emailVerified should be false initially
  await authorize_member_join(memberConnection, {
    body: {}, // empty object to accept defaults from utility
  });
  // 2) Call GET /redditLike/member/me to retrieve the profile
  const profile =
    await api.functional.redditLike.member.me.at(memberConnection);
  // 3) Validate the response structure - typia.assert validates all properties including emailVerified
  typia.assert(profile);
  // 4) Verify emailVerified is false for newly created accounts
  TestValidator.equals(
    "emailVerified is false for new account",
    profile.emailVerified,
    false,
  );
}
