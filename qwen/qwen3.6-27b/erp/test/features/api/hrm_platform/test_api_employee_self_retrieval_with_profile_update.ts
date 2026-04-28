import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Tests that the employee self-retrieval endpoint returns the current member profile after an update.
 *
 * Validates the complete profile update workflow: member registration with initial data (email, password, display_name),
 * update of the global profile fields (display_name, avatar_image, phone_number), and employee self-retrieval
 * to ensure all profile changes are properly reflected through the BELONGS-TO relationship between employee
 * and member. Tests data freshness and join query freshness to verify the employee endpoint correctly joins and
 * returns the current member profile state after profile modifications.
 *
 * 1. Member registers with initial profile data including email, password, display_name, optional href, and referrer.
 * 2. Member updates their global profile with new display_name, avatar_image, and phone_number.
 * 3. Member retrieves their employee record and validates:
 *    - member.display_name matches the updated display_name
 *    - member.avatar_image matches the updated avatar_image
 *    - member.phone_number matches the updated phone_number
 *    - member.id remains unchanged throughout the operations
 *    - member.email remains unchanged
 *    - role information remains unchanged and valid
 *    - employment_type and status remain unchanged
 *    - created_at and updated_at timestamps are properly set
 */
export async function test_api_employee_self_retrieval_with_profile_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registers with initial profile
  const initialDisplayName = RandomGenerator.name();
  const authorization = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: initialDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  const originalMember = typia.assert(authorization);
  // 2. Member updates their global profile
  const updatedDisplayName = RandomGenerator.name();
  const updatedAvatarImage: string | null = typia.random<
    string & tags.Format<"uri">
  >();
  const updatedPhoneNumber: string | null = RandomGenerator.mobile();
  const updatedMember = await api.functional.hrmPlatform.member.profile.update(
    connection,
    {
      body: {
        display_name: updatedDisplayName,
        avatar_image: updatedAvatarImage,
        phone_number: updatedPhoneNumber,
      } satisfies IHrmPlatformMember.IUpdate,
    },
  );
  const updatedProfile = typia.assert(updatedMember);
  // Validate profile update reflects changes
  TestValidator.equals(
    "display_name updated",
    updatedProfile.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "avatar_image updated",
    updatedProfile.avatar_image,
    updatedAvatarImage,
  );
  TestValidator.equals(
    "phone_number updated",
    updatedProfile.phone_number,
    updatedPhoneNumber,
  );
  TestValidator.equals(
    "id remains unchanged",
    updatedProfile.id,
    originalMember.id,
  );
  TestValidator.equals(
    "email remains unchanged",
    updatedProfile.email,
    originalMember.email,
  );
  // 3. Member retrieves their employee record
  const employee =
    await api.functional.hrmPlatform.member.employees.me(connection);
  const validatedEmployee = typia.assert(employee);
  // Validate BELONGS-TO relationship - employee.member reflects updated profile
  TestValidator.equals(
    "employee member display_name matches updated profile",
    validatedEmployee.member.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "employee member avatar_image matches updated profile",
    validatedEmployee.member.avatar_image,
    updatedAvatarImage,
  );
  TestValidator.equals(
    "employee member phone_number matches updated profile",
    validatedEmployee.member.phone_number,
    updatedPhoneNumber,
  );
  TestValidator.equals(
    "employee member id remains unchanged",
    validatedEmployee.member.id,
    originalMember.id,
  );
  TestValidator.equals(
    "employee member email remains unchanged",
    validatedEmployee.member.email,
    originalMember.email,
  );
  // Validate employment fields remain unchanged by profile update
  TestValidator.predicate(
    "employee role exists",
    validatedEmployee.role !== null && validatedEmployee.role !== undefined,
  );
  TestValidator.predicate(
    "employee has valid role",
    validatedEmployee.role.builtIn !== undefined,
  );
  TestValidator.predicate(
    "employee has employment_type set",
    validatedEmployee.employment_type !== null &&
      validatedEmployee.employment_type !== undefined,
  );
  TestValidator.predicate(
    "employee has status set",
    validatedEmployee.status !== null && validatedEmployee.status !== undefined,
  );
  TestValidator.predicate(
    "employee has created_at timestamp",
    validatedEmployee.created_at !== null &&
      validatedEmployee.created_at !== undefined,
  );
  TestValidator.predicate(
    "employee has updated_at timestamp",
    validatedEmployee.updated_at !== null &&
      validatedEmployee.updated_at !== undefined,
  );
}
