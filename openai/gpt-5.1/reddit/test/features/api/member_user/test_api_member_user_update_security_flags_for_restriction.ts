import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_member_user_update_security_flags_for_restriction(
  connection: api.IConnection,
) {
  // 1. Register a new member user via join to obtain an authorized member and token
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  const originalId = authorized.id;
  const originalUsername = authorized.username;
  const originalEmail = authorized.email;
  const originalCreatedAt = authorized.created_at;
  const originalUpdatedAt = authorized.updated_at;

  // 2. First update: apply suspension, ban, increment failed_login_count, and set locked_until in the future
  const lockoutUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const firstUpdateBody = {
    is_suspended: true,
    is_banned: true,
    failed_login_count: 5 as number & tags.Type<"int32">,
    locked_until: lockoutUntil,
  } satisfies ICommunityPlatformMemberuser.IUpdate;

  const updatedOnce: ICommunityPlatformMemberuser =
    await api.functional.communityPlatform.memberUser.memberUsers.update(
      connection,
      {
        username: originalUsername,
        body: firstUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformMemberuser>(updatedOnce);

  // 2-1. Validate identity stability and updated security fields after first update
  TestValidator.equals(
    "id should remain stable after security flags update",
    updatedOnce.id,
    originalId,
  );
  TestValidator.equals(
    "created_at should remain unchanged after security flags update",
    updatedOnce.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "username should remain unchanged after security flags update",
    updatedOnce.username,
    originalUsername,
  );
  TestValidator.equals(
    "email should remain unchanged after security flags update",
    updatedOnce.email,
    originalEmail,
  );

  TestValidator.equals(
    "is_suspended should be updated to true",
    updatedOnce.is_suspended,
    true,
  );
  TestValidator.equals(
    "is_banned should be updated to true",
    updatedOnce.is_banned,
    true,
  );
  TestValidator.equals(
    "failed_login_count should be updated to 5",
    updatedOnce.failed_login_count,
    5 as number & tags.Type<"int32">,
  );
  TestValidator.equals(
    "locked_until should match requested future timestamp",
    updatedOnce.locked_until,
    lockoutUntil,
  );

  TestValidator.predicate(
    "updated_at should change after first update",
    updatedOnce.updated_at !== originalUpdatedAt,
  );

  // 3. Second update: clear lockout and reset failed_login_count
  const secondUpdateBody = {
    is_suspended: false,
    is_banned: false,
    failed_login_count: 0 as number & tags.Type<"int32">,
    locked_until: null,
  } satisfies ICommunityPlatformMemberuser.IUpdate;

  const updatedTwice: ICommunityPlatformMemberuser =
    await api.functional.communityPlatform.memberUser.memberUsers.update(
      connection,
      {
        username: originalUsername,
        body: secondUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformMemberuser>(updatedTwice);

  // 3-1. Validate identity stability and cleared security fields after second update
  TestValidator.equals(
    "id should remain stable after clearing security flags",
    updatedTwice.id,
    originalId,
  );
  TestValidator.equals(
    "created_at should remain unchanged after clearing security flags",
    updatedTwice.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "username should remain unchanged after clearing security flags",
    updatedTwice.username,
    originalUsername,
  );
  TestValidator.equals(
    "email should remain unchanged after clearing security flags",
    updatedTwice.email,
    originalEmail,
  );

  TestValidator.equals(
    "is_suspended should be reset to false",
    updatedTwice.is_suspended,
    false,
  );
  TestValidator.equals(
    "is_banned should be reset to false",
    updatedTwice.is_banned,
    false,
  );
  TestValidator.equals(
    "failed_login_count should be reset to 0",
    updatedTwice.failed_login_count,
    0 as number & tags.Type<"int32">,
  );
  TestValidator.equals(
    "locked_until should be cleared to null",
    updatedTwice.locked_until,
    null,
  );

  TestValidator.predicate(
    "updated_at should advance again on second update",
    updatedTwice.updated_at !== updatedOnce.updated_at,
  );
}
