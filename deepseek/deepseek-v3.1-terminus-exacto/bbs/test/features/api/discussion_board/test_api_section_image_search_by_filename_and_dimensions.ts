import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test section image search functionality with filename patterns and dimension constraints.
 * A super administrator searches for images using various filtering criteria to test
 * the search API's functionality with different parameter combinations.
 */
export async function test_api_section_image_search_by_filename_and_dimensions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Use a valid section ID for testing (must exist in the system)
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test search with comprehensive filtering criteria
  const searchRequest = {
    image_type: "promotional",
    filename: "promo",
    width_min: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >() satisfies number as number,
    width_max: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000>
    >() satisfies number as number,
    height_min: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >() satisfies number as number,
    height_max: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000>
    >() satisfies number as number,
    alt_text: "accessibility",
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
  } satisfies IDiscussionBoardSectionImage.IRequest;
  const searchResults =
    await api.functional.discussionBoard.superAdmin.sections.images.index(
      superAdminConnection,
      {
        sectionId,
        body: searchRequest,
      },
    );
  typia.assert(searchResults);
  // 4. Validate pagination structure
  TestValidator.equals(
    "search returns pagination object",
    typeof searchResults.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is valid",
    searchResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    searchResults.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records count is valid",
    searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    searchResults.pagination.pages >= 0,
  );
  // 5. Test search with only filename pattern
  const filenameSearch =
    await api.functional.discussionBoard.superAdmin.sections.images.index(
      superAdminConnection,
      {
        sectionId,
        body: {
          filename: "test",
          page: 1 satisfies number as number,
          limit: 5 satisfies number as number,
        } satisfies IDiscussionBoardSectionImage.IRequest,
      },
    );
  typia.assert(filenameSearch);
  // 6. Test search with only dimension constraints
  const dimensionSearch =
    await api.functional.discussionBoard.superAdmin.sections.images.index(
      superAdminConnection,
      {
        sectionId,
        body: {
          width_min: 100 satisfies number as number,
          width_max: 500 satisfies number as number,
          height_min: 100 satisfies number as number,
          height_max: 500 satisfies number as number,
          page: 1 satisfies number as number,
          limit: 5 satisfies number as number,
        } satisfies IDiscussionBoardSectionImage.IRequest,
      },
    );
  typia.assert(dimensionSearch);
  // 7. Test search with alt text filtering
  const altTextSearch =
    await api.functional.discussionBoard.superAdmin.sections.images.index(
      superAdminConnection,
      {
        sectionId,
        body: {
          alt_text: "description",
          page: 1 satisfies number as number,
          limit: 5 satisfies number as number,
        } satisfies IDiscussionBoardSectionImage.IRequest,
      },
    );
  typia.assert(altTextSearch);
  // 8. Test empty search (no filters)
  const emptySearch =
    await api.functional.discussionBoard.superAdmin.sections.images.index(
      superAdminConnection,
      {
        sectionId,
        body: {
          page: 1 satisfies number as number,
          limit: 5 satisfies number as number,
        } satisfies IDiscussionBoardSectionImage.IRequest,
      },
    );
  typia.assert(emptySearch);
}
