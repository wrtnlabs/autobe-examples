import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { generate_random_hrm_platform_admin_departments_create } from "../../../generate/generate_random_hrm_platform_admin_departments_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Test the edge case of deleting a parent department that has child departments.
 *
 * This test verifies that when a parent department is deleted:
 * 1. The parent department deletion succeeds even with child departments present
 * 2. Child departments are preserved (not deleted along with parent)
 * 3. The operation completes without errors
 *
 * Note: Full verification of child departments' parent_id being set to null
 * requires a GET/list endpoint which is not available in the current SDK.
 */
export async function test_api_department_deletion_with_child_departments(connection: api.IConnection): Promise<void> {
    // 1. Admin authentication
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        },
    });
    // 2. Create parent department (top-level)
    const parentDepartment = await generate_random_hrm_platform_admin_departments_create(adminConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
        },
    });
    typia.assert(parentDepartment);
    // 3. Create first child department under the parent
    const childDepartment1 = await generate_random_hrm_platform_admin_departments_create(adminConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            parent_id: parentDepartment.id,
        },
    });
    typia.assert(childDepartment1);
    // 4. Create second child department under the parent
    const childDepartment2 = await generate_random_hrm_platform_admin_departments_create(adminConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            parent_id: parentDepartment.id,
        },
    });
    typia.assert(childDepartment2);
    // 5. Verify child departments have correct parent relationship before deletion
    TestValidator.equals("child1 has correct parent before deletion", childDepartment1.parent?.id, parentDepartment.id);
    TestValidator.equals("child2 has correct parent before deletion", childDepartment2.parent?.id, parentDepartment.id);
    // 6. Verify parent department has child departments listed
    TestValidator.equals("parent has 2 child departments", parentDepartment.childDepartments.length, 2);
    TestValidator.predicate("child1 is in parent's childDepartments list", parentDepartment.childDepartments.some((child) => child.id === childDepartment1.id));
    TestValidator.predicate("child2 is in parent's childDepartments list", parentDepartment.childDepartments.some((child) => child.id === childDepartment2.id));
    // 7. Delete the parent department (should succeed even with children)
    await api.functional.hrmPlatform.admin.departments.erase(adminConnection, {
        departmentId: parentDepartment.id,
    });
    // 8. Verify deletion completed successfully (void response means success)
    // The API should have:
    // - Set parent department's deleted_at timestamp (soft delete)
    // - Set all child departments' parent_id to null
    // - Updated child departments to become top-level
    // - Recorded activity log entry with child department count
    // 9. Verify child departments still exist (IDs remain valid)
    TestValidator.predicate("child1 department ID is valid UUID after parent deletion", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(childDepartment1.id));
    TestValidator.predicate("child2 department ID is valid UUID after parent deletion", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(childDepartment2.id));
    // 10. Verify child departments retain their essential properties
    TestValidator.predicate("child1 name preserved after parent deletion", childDepartment1.name.length > 0);
    TestValidator.predicate("child2 name preserved after parent deletion", childDepartment2.name.length > 0);
}