import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";/**
 * Prepare random HR platform project membership creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformProjectMembership.ICreate with randomized values.
 * The employeeId is generated as a random UUID format string.
 * The capacityRole is randomly selected from the valid role options ("member" or "project-lead").
 *
 * Use this function to create test data for verifying project membership assignment,
 * role-based permissions, and employee-project associations in the HRM platform.
 */
export function prepare_random_hrm_platform_project_membership(input?: DeepPartial<IHrmPlatformProjectMembership.ICreate>): IHrmPlatformProjectMembership.ICreate {
    return {
        employeeId: input?.employeeId ?? typia.random<string & tags.Format<"uuid">>(),
        capacityRole: input?.capacityRole ?? RandomGenerator.pick(["member", "project-lead"] as const),
    };
}