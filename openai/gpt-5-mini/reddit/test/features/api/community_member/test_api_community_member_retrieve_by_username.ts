import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsProfile";

export async function test_api_community_member_retrieve_by_username(
  connection: api.IConnection,
) {
  // 1) Prepare join request body
  const joinBody = {
    email: "alice@example.test",
    username: "alice",
    password: "Passw0rd!",
    display_name: "Alice Example",
    profile: {
      display_name: "Alice Example",
      bio: RandomGenerator.paragraph({ sentences: 8, wordMin: 4, wordMax: 8 }),
      avatar_uri: null,
    },
    session_context: {
      href: "http://localhost/welcome",
      referrer: "http://localhost/referrer",
      ip: "127.0.0.1",
      session_ttl_seconds: 3600,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  // 2) Create member via join
  const created: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: joinBody,
    });
  typia.assert(created);

  // Ensure member summary exists on created response
  const createdMember = created.member;
  typia.assert(createdMember);

  // 3) Retrieve public member by username
  const read: ICommunityBbsCommunityMember =
    await api.functional.communityBbs.communityMembers.at(connection, {
      username: createdMember.username,
    });
  typia.assert(read);

  // 4) Business assertions
  TestValidator.equals(
    "username matches created member",
    read.username,
    createdMember.username,
  );

  TestValidator.equals(
    "display_name matches created member",
    read.display_name ?? null,
    createdMember.display_name ?? null,
  );

  TestValidator.equals(
    "created_at matches created member",
    read.created_at,
    createdMember.created_at,
  );

  TestValidator.equals(
    "updated_at matches created member",
    read.updated_at,
    createdMember.updated_at,
  );

  TestValidator.predicate("karma is a number", typeof read.karma === "number");

  TestValidator.predicate(
    "account is not soft-deleted (deleted_at is null or undefined)",
    read.deleted_at === null || read.deleted_at === undefined,
  );

  // Expect fresh join to have email_verified === false per DTO semantics
  TestValidator.equals(
    "email_verified is false for fresh join",
    read.email_verified ?? false,
    false,
  );

  // 5) Security assertions: ensure sensitive fields are not present in JSON
  TestValidator.predicate(
    "response does not contain password_hash",
    !JSON.stringify(read).includes("password_hash"),
  );
  TestValidator.predicate(
    "response does not contain password_reset_token_hash",
    !JSON.stringify(read).includes("password_reset_token_hash"),
  );
}
