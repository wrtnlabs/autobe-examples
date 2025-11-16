import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_member_user_update_own_account_profile_and_security_flags(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authorized context
  const initialJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: initialJoinBody,
    });
  typia.assert(authorized);

  // 2. Prepare an update body that changes email and security flags
  const newEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const firstUpdateBody = {
    email: newEmail,
    failed_login_count: 0 as number & tags.Type<"int32">,
    locked_until: null,
    is_suspended: true,
    is_banned: false,
  } satisfies ICommunityPlatformMemberuser.IUpdate;

  const updated: ICommunityPlatformMemberuser =
    await api.functional.communityPlatform.memberUser.memberUsers.update(
      connection,
      {
        username: authorized.username,
        body: firstUpdateBody,
      },
    );
  typia.assert(updated);

  // 3. Validate immutable and mutable fields after first update
  TestValidator.equals(
    "id must remain stable after update",
    updated.id,
    authorized.id,
  );

  TestValidator.equals(
    "created_at must remain stable after update",
    updated.created_at,
    authorized.created_at,
  );

  TestValidator.predicate(
    "updated_at must be same or newer than original updated_at",
    new Date(updated.updated_at).getTime() >=
      new Date(authorized.updated_at).getTime(),
  );

  TestValidator.equals(
    "email must be updated to new value",
    updated.email,
    newEmail,
  );

  TestValidator.equals(
    "failed_login_count must be reset to 0",
    updated.failed_login_count,
    firstUpdateBody.failed_login_count,
  );

  TestValidator.equals(
    "locked_until must be cleared to null",
    updated.locked_until ?? null,
    firstUpdateBody.locked_until,
  );

  TestValidator.equals(
    "is_suspended must match update payload",
    updated.is_suspended,
    firstUpdateBody.is_suspended,
  );

  TestValidator.equals(
    "is_banned must match update payload",
    updated.is_banned,
    firstUpdateBody.is_banned,
  );

  // 4. Perform a second update with different values to ensure subsequent updates work
  const secondEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const secondUpdateBody = {
    email: secondEmail,
    failed_login_count: 5 as number & tags.Type<"int32">,
    locked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    is_suspended: false,
    is_banned: true,
  } satisfies ICommunityPlatformMemberuser.IUpdate;

  const updatedAgain: ICommunityPlatformMemberuser =
    await api.functional.communityPlatform.memberUser.memberUsers.update(
      connection,
      {
        username: authorized.username,
        body: secondUpdateBody,
      },
    );
  typia.assert(updatedAgain);

  // 5. Validate that updates have been applied consistently
  TestValidator.equals(
    "id must remain stable after second update",
    updatedAgain.id,
    authorized.id,
  );

  TestValidator.equals(
    "created_at must remain stable after second update",
    updatedAgain.created_at,
    authorized.created_at,
  );

  TestValidator.predicate(
    "updated_at must move forward or stay same after second update",
    new Date(updatedAgain.updated_at).getTime() >=
      new Date(updated.updated_at).getTime(),
  );

  TestValidator.equals(
    "email must be updated to second value",
    updatedAgain.email,
    secondEmail,
  );

  TestValidator.equals(
    "failed_login_count must match second update payload",
    updatedAgain.failed_login_count,
    secondUpdateBody.failed_login_count,
  );

  TestValidator.equals(
    "locked_until must match second update payload",
    updatedAgain.locked_until,
    secondUpdateBody.locked_until,
  );

  TestValidator.equals(
    "is_suspended must match second update payload",
    updatedAgain.is_suspended,
    secondUpdateBody.is_suspended,
  );

  TestValidator.equals(
    "is_banned must match second update payload",
    updatedAgain.is_banned,
    secondUpdateBody.is_banned,
  );
}
