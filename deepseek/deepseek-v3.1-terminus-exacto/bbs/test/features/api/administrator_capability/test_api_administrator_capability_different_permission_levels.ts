import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { prepare_random_discussion_board_administrator_capability } from "../../../prepare/prepare_random_discussion_board_administrator_capability";
import { prepare_random_discussion_board_super_admin } from "../../../prepare/prepare_random_discussion_board_super_admin";
import { generate_random_discussion_board_super_admin_administrators_capabilities_create } from "../../../generate/generate_random_discussion_board_super_admin_administrators_capabilities_create";
import { generate_random_discussion_board_super_admin_administrators_create } from "../../../generate/generate_random_discussion_board_super_admin_administrators_create";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_administrator_capability_different_permission_levels(connection: api.IConnection): Promise<void> {
    // Create super admin connection
    const superAdminConnection: api.IConnection = { host: connection.host };
    
    // Step 1: Authenticate as super administrator
    const superAdmin = await authorize_super_admin_join(superAdminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
    });
    typia.assert(superAdmin);
    
    // Step 2: Create a regular administrator
    const regularAdmin = await generate_random_discussion_board_super_admin_administrators_create(superAdminConnection, {
        body: {
            permission_level: "admin",
            admin_id: null,
            super_admin_id: null,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
    });
    typia.assert(regularAdmin);
    
    // Step 3: Assign first capability - content_moderation with read_only
    const capability1 = await generate_random_discussion_board_super_admin_administrators_capabilities_create(superAdminConnection, {
        params: { administratorId: regularAdmin.id },
        body: {
            capability_type: "content_moderation",
            permission_level: "read_only",
        } satisfies IDiscussionBoardAdministratorCapability.ICreate,
    });
    typia.assert(capability1);
    
    // Step 4: Assign second capability - user_management with full_access
    const capability2 = await generate_random_discussion_board_super_admin_administrators_capabilities_create(superAdminConnection, {
        params: { administratorId: regularAdmin.id },
        body: {
            capability_type: "user_management",
            permission_level: "full_access",
        } satisfies IDiscussionBoardAdministratorCapability.ICreate,
    });
    typia.assert(capability2);
    
    // Step 5: Attempt to assign duplicate capability type - user_management with limited_scope (should fail)
    await TestValidator.error("duplicate capability type assignment", async () => {
        await api.functional.discussionBoard.superAdmin.administrators.capabilities.create(superAdminConnection, {
            administratorId: regularAdmin.id,
            body: {
                capability_type: "user_management",
                permission_level: "limited_scope",
            } satisfies IDiscussionBoardAdministratorCapability.ICreate,
        });
    });
    
    // Step 6: Validate capability assignments
    TestValidator.equals("first capability type", capability1.capability_type, "content_moderation");
    TestValidator.equals("first capability permission level", capability1.permission_level, "read_only");
    TestValidator.equals("second capability type", capability2.capability_type, "user_management");
    TestValidator.equals("second capability permission level", capability2.permission_level, "full_access");
    TestValidator.notEquals("capability types are different", capability1.capability_type, capability2.capability_type);
}