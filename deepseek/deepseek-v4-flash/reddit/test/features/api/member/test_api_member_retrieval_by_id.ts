import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member retrieval by UUID after registration.
 *
 * Registers a new member with tracked credentials, then retrieves the member record by UUID using the public lookup endpoint. Validates that the full member data matches the registration input, that the profile defaults are correct for a new account, and that sensitive fields like the password hash are excluded from the response.
 *
 * 1. Register a new member with known email, username, and password.
 * 2. Extract the member UUID from the join response.
 * 3. Retrieve the member by UUID via the public endpoint.
 * 4. Validate the response: structural integrity via typia.assertEquals, business logic via TestValidator helpers.
 */
export async function test_api_member_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with explicitly tracked credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.name(1);
  const password: string = RandomGenerator.alphaNumeric(16);
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const ip: string & tags.Format<"ipv4"> = typia.random<
    string & tags.Format<"ipv4">
  >();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      username,
      password,
      href,
      referrer,
      ip,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const memberId = authorized.id;
  // 2. Retrieve the member by their UUID (public endpoint, no auth required)
  const member = await api.functional.communityPlatform.members.at(connection, {
    memberId,
  });
  // 3. Validate structural integrity & confirm no password_hash leak
  typia.assertEquals(member);
  // 4. Validate business logic against registration input
  TestValidator.equals("member ID matches registration", member.id, memberId);
  TestValidator.equals("email matches registration input", member.email, email);
  TestValidator.equals(
    "username matches registration input",
    member.username,
    username,
  );
  TestValidator.predicate(
    "deleted_at is null for active account",
    member.deleted_at === null,
  );
  TestValidator.equals(
    "profile.biography is null for new registration",
    member.profile.biography,
    null,
  );
  TestValidator.equals(
    "profile.avatar_uri is null for new registration",
    member.profile.avatar_uri,
    null,
  );
  TestValidator.equals(
    "profile.karma is 0 for new registration",
    member.profile.karma,
    0,
  );
  TestValidator.predicate(
    "profile.display_name is auto-populated",
    typeof member.profile.display_name === "string" &&
      member.profile.display_name.length > 0,
  );
}
