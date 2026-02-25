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

export async function test_api_section_files_filter_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create test section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          status: "active",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Create test files with specific attributes
  const files = await ArrayUtil.asyncRepeat(3, async (index) => {
    const file =
      await generate_random_discussion_board_super_admin_sections_files_create(
        superAdminConnection,
        {
          params: { sectionId: section.id },
          body: {
            attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
            display_order: index + 1,
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
            caption: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    typia.assert(file);
    return file;
  });
  // Test 1: Search for non-existent filename
  const nonExistentFilenameResult =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          filename: "non_existent_file_name_that_does_not_exist",
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(nonExistentFilenameResult);
  TestValidator.equals(
    "empty results for non-existent filename",
    nonExistentFilenameResult.data.length,
    0,
  );
  // Test 2: Search for file type not present
  const nonExistentFileTypeResult =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          file_type: "application/pdf",
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(nonExistentFileTypeResult);
  TestValidator.equals(
    "empty results for non-existent file type",
    nonExistentFileTypeResult.data.length,
    0,
  );
  // Test 3: Search with size range that excludes all files
  const sizeRangeResult =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          file_size_min: 1000000,
          file_size_max: 2000000,
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(sizeRangeResult);
  TestValidator.equals(
    "empty results for size range",
    sizeRangeResult.data.length,
    0,
  );
  // Test 4: Search for description content that doesn't match
  const nonMatchingDescriptionResult =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          description: "completely_unrelated_description_content",
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(nonMatchingDescriptionResult);
  TestValidator.equals(
    "empty results for non-matching description",
    nonMatchingDescriptionResult.data.length,
    0,
  );
  // Test 5: Combination filter that produces empty results
  const combinationFilterResult =
    await api.functional.discussionBoard.superAdmin.sections.files.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          filename: "non_existent",
          file_type: "application/pdf",
          file_size_min: 1000000,
          description: "unrelated",
        } satisfies IDiscussionBoardSectionFile.IRequest,
      },
    );
  typia.assert(combinationFilterResult);
  TestValidator.equals(
    "empty results for combination filter",
    combinationFilterResult.data.length,
    0,
  );
}
