import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_super_admin } from "../../../prepare/prepare_random_discussion_board_super_admin";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_super_admin_sections_administrators_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_administrators_create";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_section_administrator_super_admin_to_super_admin_linking(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as superAdmin
    const superAdminConnection: api.IConnection = { host: connection.host };
    const superAdminCreds = {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>()
    } satisfies IDiscussionBoardSuperAdmin.IJoin;
    
    const authorizedSuperAdmin = await authorize_super_admin_join(superAdminConnection, {
        body: superAdminCreds,
    });
    typia.assert(authorizedSuperAdmin);
    
    // 2. Create a section
    const section = await generate_random_discussion_board_super_admin_sections_create(superAdminConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.content({ paragraphs: 1 }),
            status: "active",
            display_order: typia.random<number & tags.Type<"int32">>()
        } satisfies IDiscussionBoardSection.ICreate,
    });
    typia.assert(section);
    
    // 3. Create super administrator assignment
    const assignmentBody = {
        permission_level: "full",
        super_admin_id: authorizedSuperAdmin.id
    } satisfies IDiscussionBoardSuperAdmin.ICreate;
    
    const initialAssignment = await generate_random_discussion_board_super_admin_sections_administrators_create(superAdminConnection, {
        body: assignmentBody,
        params: { sectionId: section.id },
    });
    typia.assert(initialAssignment);
    
    // 4. Update permission level
    const updateBody = {
        permission_level: "limited"
    } satisfies IDiscussionBoardSuperAdmin.IUpdate;
    
    const updatedAssignment = await api.functional.discussionBoard.superAdmin.sections.administrators.update(superAdminConnection, {
        sectionId: section.id,
        assignmentId: initialAssignment.id,
        body: updateBody,
    });
    typia.assert(updatedAssignment);
    
    // 5. Validate business logic - assignment belongs to super administrator
    TestValidator.equals("superAdmin ID should match original super admin", updatedAssignment.superAdmin?.id, authorizedSuperAdmin.id);
    TestValidator.equals("admin field should be null for super admin assignment", updatedAssignment.admin, null);
    TestValidator.equals("permission level should be updated", updatedAssignment.permission_level, "limited");
    
    // 6. Verify referential integrity maintained
    TestValidator.equals("assignment ID should remain the same", updatedAssignment.id, initialAssignment.id);
    TestValidator.equals("section reference should be maintained", updatedAssignment.section.id, section.id);
}