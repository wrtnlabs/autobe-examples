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
import type { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionFile";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_file } from "../../../prepare/prepare_random_discussion_board_section_file";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_super_admin_sections_files_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_files_create";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
/**
 * Test advanced file filtering capabilities for discussion board section files.
 * 1. Create superAdmin account and authenticate
 * 2. Create a section to upload files to
 * 3. Upload multiple files with different characteristics (various file types, sizes, descriptions)
 * 4. Perform searches with specific filters: exact file type filtering and description content search
 * 5. Validate that each filter correctly returns only matching files and excludes non-matching ones
 */
export async function test_api_section_file_search_advanced_filtering(connection: api.IConnection): Promise<void> {
    // 1. Create superAdmin account and authenticate
    const superAdminConnection: api.IConnection = { host: connection.host };
    const superAdmin = await authorize_super_admin_join(superAdminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.Format<"password">>(),
            privilege_level: "super_admin",
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
    });
    typia.assert(superAdmin);
    // 2. Create a section to upload files to
    const section = await generate_random_discussion_board_super_admin_sections_create(superAdminConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            display_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        } satisfies IDiscussionBoardSection.ICreate,
    });
    typia.assert(section);
    // 3. Upload multiple files with different characteristics
    const fileTypes = ["pdf", "docx", "jpg", "png", "txt"] as const;
    const descriptions = [
        "Important document for project management",
        "Technical specification document",
        "Project image file",
        "Chart diagram for presentation",
        "Readme file with instructions",
    ] as const;
    const files = await Promise.all(ArrayUtil.repeat(5, (index) => generate_random_discussion_board_super_admin_sections_files_create(superAdminConnection, {
        params: { sectionId: section.id },
        body: {
            filename: `test_file_${index}.${fileTypes[index]}`,
            file_type: fileTypes[index],
            file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<5000>>(),
            file_path: `/uploads/section_${section.id}/file_${index}.${fileTypes[index]}`,
            description: descriptions[index],
        } satisfies IDiscussionBoardSectionFile.ICreate,
    })));
    files.forEach(file => typia.assert(file));
    // 4. Perform searches with specific filters and validate results
    // Test exact file type filtering - PDF files
    const pdfSearch = await api.functional.discussionBoard.superAdmin.sections.files.index(superAdminConnection, {
        sectionId: section.id,
        body: {
            file_type: "pdf",
        } satisfies IDiscussionBoardSectionFile.IRequest,
    });
    typia.assert(pdfSearch);
    // Validate PDF search returns only PDF files
    TestValidator.equals("PDF search returns correct count", pdfSearch.data.length, 1);
    TestValidator.predicate("PDF search returns PDF file", pdfSearch.data.every(file => file.file_type === "pdf"));
    // Test exact file type filtering - JPG files
    const jpgSearch = await api.functional.discussionBoard.superAdmin.sections.files.index(superAdminConnection, {
        sectionId: section.id,
        body: {
            file_type: "jpg",
        } satisfies IDiscussionBoardSectionFile.IRequest,
    });
    typia.assert(jpgSearch);
    // Validate JPG search returns only JPG files
    TestValidator.equals("JPG search returns correct count", jpgSearch.data.length, 1);
    TestValidator.predicate("JPG search returns JPG file", jpgSearch.data.every(file => file.file_type === "jpg"));
    // Test description content search - "project" keyword
    const projectSearch = await api.functional.discussionBoard.superAdmin.sections.files.index(superAdminConnection, {
        sectionId: section.id,
        body: {
            description: "project",
        } satisfies IDiscussionBoardSectionFile.IRequest,
    });
    typia.assert(projectSearch);
    // Validate description search returns files containing "project" in description
    TestValidator.predicate("Project search returns files with project in description", projectSearch.data.every(file => file.description?.toLowerCase().includes("project") ?? false));
    // Test description content search - "document" keyword
    const documentSearch = await api.functional.discussionBoard.superAdmin.sections.files.index(superAdminConnection, {
        sectionId: section.id,
        body: {
            description: "document",
        } satisfies IDiscussionBoardSectionFile.IRequest,
    });
    typia.assert(documentSearch);
    // Validate description search returns files containing "document" in description
    TestValidator.predicate("Document search returns files with document in description", documentSearch.data.every(file => file.description?.toLowerCase().includes("document") ?? false));
    // Test combined filter - file type and description
    const combinedSearch = await api.functional.discussionBoard.superAdmin.sections.files.index(superAdminConnection, {
        sectionId: section.id,
        body: {
            file_type: "pdf",
            description: "project",
        } satisfies IDiscussionBoardSectionFile.IRequest,
    });
    typia.assert(combinedSearch);
    // Validate combined search returns files matching both criteria
    TestValidator.predicate("Combined search returns files matching both criteria", combinedSearch.data.every(file => file.file_type === "pdf" && 
        (file.description?.toLowerCase().includes("project") ?? false)));
    // Test empty search (should return all files)
    const emptySearch = await api.functional.discussionBoard.superAdmin.sections.files.index(superAdminConnection, {
        sectionId: section.id,
        body: {} satisfies IDiscussionBoardSectionFile.IRequest,
    });
    typia.assert(emptySearch);
    // Validate empty search returns all uploaded files
    TestValidator.equals("Empty search returns all files", emptySearch.data.length, files.length);
}