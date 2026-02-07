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

export async function test_api_section_image_search_by_type_and_size(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Note: Since there's no section creation API available in the provided SDK,
  // we'll need to use a valid section ID that exists in the system.
  // For this test, we'll assume there's at least one section available.
  // In a real scenario, we would create a section first.
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Execute search with specific criteria for banner images between 1MB and 5MB
  const searchResponse =
    await api.functional.discussionBoard.superAdmin.sections.images.index(
      superAdminConnection,
      {
        sectionId: sectionId,
        body: {
          image_type: "banner",
          file_size_min: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1048576>
          >() satisfies number as number,
          file_size_max: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5242880>
          >() satisfies number as number,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardSectionImage.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResponse.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records count",
    searchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count",
    searchResponse.pagination.pages >= 0,
  );
  // Validate that returned images match the search criteria
  for (const image of searchResponse.data) {
    TestValidator.predicate("has id", !!image.id);
    TestValidator.predicate("has filename", !!image.filename);
    TestValidator.predicate("has mime_type", !!image.mime_type);
    TestValidator.predicate(
      "has file_size within range",
      image.file_size >= 1048576 && image.file_size <= 5242880,
    );
    TestValidator.predicate("has width", image.width > 0);
    TestValidator.predicate("has height", image.height > 0);
    TestValidator.equals("has correct image_type", image.image_type, "banner");
    TestValidator.predicate("has storage_path", !!image.storage_path);
    TestValidator.predicate("has section", !!image.section);
    TestValidator.equals("section id matches", image.section.id, sectionId);
  }
}
