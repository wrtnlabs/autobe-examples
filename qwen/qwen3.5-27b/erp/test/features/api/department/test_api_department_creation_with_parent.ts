import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_departments_create } from "../../../generate/generate_random_hrm_time_track_member_departments_create";
import { prepare_random_hrm_time_track_department } from "../../../prepare/prepare_random_hrm_time_track_department";

/**
 * Test creating a child department under an existing parent department to validate hierarchical structure.
 *
 * Validates the complete department hierarchy creation flow including parent department setup, child department creation with parent reference, and response validation. Ensures that the hierarchical relationship is correctly established and maintained in the response.
 *
 * Special attention is given to verifying that the parent_department_id reference is correctly maintained and that the parentDepartment object in the response contains the expected parent department summary information.
 *
 * 1. Register and authenticate as a member with organization management permissions.
 * 2. Create a parent department without a parent (top-level department).
 * 3. Create a child department with parent_department_id referencing the parent.
 * 4. Validate child department response contains correct parentDepartment reference.
 */
export async function test_api_department_creation_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Create parent department (top-level, no parent)
  const parentDepartment =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(parentDepartment);
  // 3. Create child department with parent reference
  const childDepartment =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_department_id: parentDepartment.id,
        },
      },
    );
  typia.assert(childDepartment);
  // 4. Validate hierarchical relationship
  TestValidator.equals(
    "child department has correct parent reference",
    childDepartment.parentDepartment?.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "child department parent name matches",
    childDepartment.parentDepartment?.name,
    parentDepartment.name,
  );
  TestValidator.equals(
    "child department belongs to same organization",
    childDepartment.organization.id,
    parentDepartment.organization.id,
  );
  TestValidator.predicate(
    "child department has valid ID",
    childDepartment.id !== parentDepartment.id,
  );
  TestValidator.predicate(
    "child department deleted_at is null",
    childDepartment.deleted_at === null,
  );
  TestValidator.predicate(
    "parent department deleted_at is null",
    parentDepartment.deleted_at === null,
  );
}
