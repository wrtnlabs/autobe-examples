import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Validate retrieving a member's basic information immediately after account creation.
 *
 * A new member registers, creating a member record with authentication identity but without an initialized profile. The endpoint should return the complete member details, showing null values for profile-specific fields (display_name, bio) and default karma, confirming that the member lookup correctly handles uninitialized profiles.
 *
 * 1. Register a new member with randomized credentials using authorize_member_join.
 * 2. Retrieve the member details using their unique member ID.
 * 3. Validate that returned member matches registration data.
 * 4. Verify profile-specific fields are null.
 * 5. Verify karma defaults to 0.
 */
export async function test_api_member_retrieval_after_registration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IREdditLikeCommunityMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // 2. Retrieve the member details
  const member = await api.functional.redditLikeCommunity.members.at(
    memberConnection,
    {
      memberId: authorized.id,
    },
  );
  typia.assert(member);
  // 3. Validate member matches registration data
  TestValidator.equals(
    "member id matches registration",
    member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member username matches registration",
    member.username,
    joinBody.username,
  );
  TestValidator.equals(
    "member email matches registration",
    member.email,
    joinBody.email,
  );
  // 4. Verify profile-specific fields are null
  TestValidator.equals(
    "display_name is null for new member",
    member.display_name,
    null,
  );
  TestValidator.equals("bio is null for new member", member.bio, null);
  // 5. Verify karma defaults to 0
  TestValidator.equals("karma defaults to 0 for new member", member.karma, 0);
}
