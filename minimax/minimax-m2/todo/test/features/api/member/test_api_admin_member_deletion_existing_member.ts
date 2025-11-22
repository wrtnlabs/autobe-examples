import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

export async function test_api_admin_member_deletion_existing_member(
  connection: api.IConnection,
) {
  // Create admin account through join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "admin123456";

  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create member account through join to establish initial authentication context
  const memberEmail: string = typia.random<string & tags.Format<"email">>();

  const member: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        first_name: "John",
        last_name: "Doe",
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member);

  // Establish "existing" member login context by logging in with the created account
  // Using the same email and assuming password functionality works as designed
  const loginResult: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.login.authenticateMember(connection, {
      body: {
        email: memberEmail,
        password: "default_password", // Assuming default password for existing member
        href: "https://example.com/login",
        referrer: "https://example.com/home",
      } satisfies ITodoAppMember.ILogin,
    });
  typia.assert(loginResult);

  // Validate member login was successful
  TestValidator.equals(
    "member login successful",
    loginResult.email,
    memberEmail,
  );

  // Admin creates another member profile that will be deleted
  const targetMemberEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const targetMemberProfile: ITodoAppMember =
    await api.functional.todoApp.member.members.create(connection, {
      body: {
        email: targetMemberEmail,
        first_name: "Jane",
        last_name: "Smith",
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(targetMemberProfile);

  // Validate member profile was created successfully
  TestValidator.equals(
    "target member profile created",
    targetMemberProfile.email,
    targetMemberEmail,
  );
  TestValidator.equals(
    "target member first name",
    targetMemberProfile.first_name,
    "Jane",
  );
  TestValidator.equals(
    "target member last name",
    targetMemberProfile.last_name,
    "Smith",
  );
  TestValidator.predicate(
    "target member profile has no deletion timestamp",
    !targetMemberProfile.deleted_at,
  );

  // Admin performs soft deletion on the existing member account
  const deletedMemberProfile: ITodoAppMember =
    await api.functional.todoApp.admin.members.erase(connection, {
      memberId: targetMemberProfile.id,
    });
  typia.assert(deletedMemberProfile);

  // Validate soft deletion behavior and data preservation
  TestValidator.equals(
    "member profile ID preserved after deletion",
    deletedMemberProfile.id,
    targetMemberProfile.id,
  );
  TestValidator.equals(
    "member email preserved after deletion",
    deletedMemberProfile.email,
    targetMemberEmail,
  );
  TestValidator.equals(
    "member first name preserved after deletion",
    deletedMemberProfile.first_name,
    "Jane",
  );
  TestValidator.equals(
    "member last name preserved after deletion",
    deletedMemberProfile.last_name,
    "Smith",
  );
  TestValidator.equals(
    "member status preserved after deletion",
    deletedMemberProfile.status,
    "active",
  );

  // Validate deletion timestamp was set (soft deletion)
  TestValidator.predicate(
    "deletion timestamp was set after admin deletion",
    !!deletedMemberProfile.deleted_at,
  );
  TestValidator.predicate(
    "deletion timestamp is valid ISO date format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      deletedMemberProfile.deleted_at!,
    ),
  );

  // Validate other timestamps are preserved for audit compliance
  TestValidator.predicate(
    "creation timestamp is preserved for audit",
    !!deletedMemberProfile.created_at,
  );
  TestValidator.predicate(
    "update timestamp is preserved for audit",
    !!deletedMemberProfile.updated_at,
  );

  // Validate that deletion occurred after creation (logical timestamp order)
  const creationTime = new Date(targetMemberProfile.created_at).getTime();
  const deletionTime = new Date(deletedMemberProfile.deleted_at!).getTime();
  TestValidator.predicate(
    "deletion occurs after creation",
    deletionTime >= creationTime,
  );
}
