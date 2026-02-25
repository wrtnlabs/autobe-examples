import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_super_admin_sections_images_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_images_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_image } from "../../../prepare/prepare_random_discussion_board_section_image";

export async function test_api_section_images_empty_section_filtering(
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
  // Create an empty section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Test empty section images with default pagination
  const emptyImages =
    await api.functional.discussionBoard.superAdmin.sections.images.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionImage.IRequest,
      },
    );
  typia.assert(emptyImages);
  // Validate empty pagination metadata - fix property access
  TestValidator.equals("empty data array", emptyImages.data.length, 0);
  TestValidator.equals(
    "current page",
    emptyImages.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit",
    emptyImages.pagination.pagination.pagination.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records",
    emptyImages.pagination.pagination.pagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages",
    emptyImages.pagination.pagination.pagination.pagination.pages,
    0,
  );
  // Add banner image to section using utility function
  const bannerImage =
    await generate_random_discussion_board_super_admin_sections_images_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          filename: "banner.jpg",
          mime_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1000>
          >(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
          image_type: "banner",
          storage_path: "/images/banner.jpg",
          alt_text: "Section banner image",
        } satisfies IDiscussionBoardSectionImage.ICreate,
      },
    );
  typia.assert(bannerImage);
  // Test filtering for non-existing thumbnail type
  const thumbnailFilter =
    await api.functional.discussionBoard.superAdmin.sections.images.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          image_type: "thumbnail",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionImage.IRequest,
      },
    );
  typia.assert(thumbnailFilter);
  // Validate empty results for non-existing type
  TestValidator.equals("no thumbnail images", thumbnailFilter.data.length, 0);
  TestValidator.equals(
    "thumbnail filter records",
    thumbnailFilter.pagination.pagination.pagination.pagination.records,
    0,
  );
  // Test filtering for existing banner type
  const bannerFilter =
    await api.functional.discussionBoard.superAdmin.sections.images.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          image_type: "banner",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionImage.IRequest,
      },
    );
  typia.assert(bannerFilter);
  // Validate banner filter results
  TestValidator.equals("banner images found", bannerFilter.data.length, 1);
  TestValidator.equals(
    "banner filter records",
    bannerFilter.pagination.pagination.pagination.pagination.records,
    1,
  );
  TestValidator.equals(
    "banner image type",
    bannerFilter.data[0].image_type,
    "banner",
  );
  // Test pagination beyond available records
  const beyondPagination =
    await api.functional.discussionBoard.superAdmin.sections.images.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardSectionImage.IRequest,
      },
    );
  typia.assert(beyondPagination);
  // Validate pagination metadata for page beyond records
  TestValidator.equals("page 2 empty data", beyondPagination.data.length, 0);
  TestValidator.equals(
    "page 2 current page",
    beyondPagination.pagination.pagination.pagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit",
    beyondPagination.pagination.pagination.pagination.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 2 total records",
    beyondPagination.pagination.pagination.pagination.pagination.records,
    1,
  );
  TestValidator.equals(
    "page 2 total pages",
    beyondPagination.pagination.pagination.pagination.pagination.pages,
    1,
  );
  // Test search with no results
  const noResultsSearch =
    await api.functional.discussionBoard.superAdmin.sections.images.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          search: "nonexistentfilename",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionImage.IRequest,
      },
    );
  typia.assert(noResultsSearch);
  // Validate search with no results
  TestValidator.equals("search no results", noResultsSearch.data.length, 0);
  TestValidator.equals(
    "search total records",
    noResultsSearch.pagination.pagination.pagination.pagination.records,
    0,
  );
}
