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
 * Test section image search functionality when no images match the specified criteria.
 * Validates proper handling of empty result sets with correct pagination metadata.
 */
export async function test_api_section_image_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Search for images with criteria that guarantee no matches
  // Using multiple restrictive criteria to ensure empty results
  const searchResult =
    await api.functional.discussionBoard.superAdmin.sections.images.index(
      superAdminConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          image_type: "thumbnail",
          mime_type: "image/webp",
          width_min: 9999 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as number,
          height_min: 9999 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as number,
          file_size_min: 1000000000 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as number,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies IDiscussionBoardSectionImage.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Validate empty result set structure
  TestValidator.equals(
    "records should be zero",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be zero",
    searchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "data array should be empty",
    searchResult.data.length,
    0,
  );
}
