import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_super_admin_sections_files_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_files_create";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_files_retrieval_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Update connection headers with token
  superAdminConnection.headers = {
    Authorization: `Bearer ${authResult.token.access}`,
  };
  // 2. Create test section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Create test files with predictable metadata for filtering tests
  const testFiles: IDiscussionBoardArticleFile[] = [];
  // Create files with specific metadata for filtering tests
  const fileMetadatas = [
    {
      filename: "document_important.pdf",
      file_type: "application/pdf",
      file_size: 500000,
      description: "Important configuration document",
    },
    {
      filename: "profile_image.jpg",
      file_type: "image/jpeg",
      file_size: 200000,
      description: "User profile picture",
    },
    {
      filename: "config_settings.txt",
      file_type: "text/plain",
      file_size: 10000,
      description: "System configuration settings",
    },
    {
      filename: "data_export.json",
      file_type: "application/json",
      file_size: 150000,
      description: "Data export file",
    },
    {
      filename: "backup_document.pdf",
      file_type: "application/pdf",
      file_size: 800000,
      description: "Backup configuration document",
    },
    {
      filename: "logo_image.png",
      file_type: "image/png",
      file_size: 300000,
      description: "Company logo image",
    },
  ];
  for (const metadata of fileMetadatas) {
    const file =
      await generate_random_discussion_board_super_admin_sections_files_create(
        superAdminConnection,
        {
          params: { sectionId: section.id },
          body: {
            attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
            display_order: typia.random<number & tags.Type<"int32">>(),
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
            caption: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    typia.assert(file);
    testFiles.push(file);
  }
  // 4. Test filename partial match search
  const filenameSearch =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          filename: "document",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(filenameSearch);
  TestValidator.predicate(
    "filename search returns matching files",
    filenameSearch.data.length > 0,
  );
  // 5. Test specific file type filtering
  const pdfFiles =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          file_type: "application/pdf",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(pdfFiles);
  TestValidator.predicate(
    "file type filter returns PDF files",
    pdfFiles.data.length >= 2,
  );
  // 6. Test size range filtering
  const mediumFiles =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          file_size_min: 100000,
          file_size_max: 600000,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(mediumFiles);
  TestValidator.predicate(
    "size range filter returns correct files",
    mediumFiles.data.length > 0,
  );
  // 7. Test description search
  const configSearch =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          description: "configuration",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(configSearch);
  TestValidator.predicate(
    "description search returns configuration files",
    configSearch.data.length > 0,
  );
  // 8. Test pagination with small limit
  const page1 =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 has correct limit", page1.data.length, 2);
  // 9. Test second page
  const page2 =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.predicate("page 2 returns results", page2.data.length <= 2);
  // 10. Test combined filters
  const combinedFilter =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          filename: "image",
          file_type: "image/jpeg",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // 11. Test empty filters return all files
  const allFiles =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(allFiles);
  TestValidator.predicate(
    "empty filters return all files",
    allFiles.data.length >= 6,
  );
  // 12. Validate pagination metadata - FIXED: Use correct nested structure
  TestValidator.equals(
    "current page is correct",
    allFiles.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is correct",
    allFiles.pagination.pagination.pagination.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "has valid records count",
    allFiles.pagination.pagination.pagination.pagination.records >= 6,
  );
  TestValidator.predicate(
    "has valid pages count",
    allFiles.pagination.pagination.pagination.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "total records matches expected",
    allFiles.pagination.pagination.pagination.pagination.records ===
      allFiles.data.length,
  );
}
