import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_image_search_basic_functionality(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create a section to search images within
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Perform basic image search with minimal criteria
  const searchResults =
    await api.functional.discussionBoard.admin.sections.images.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionImage.IRequest,
      },
    );
  typia.assert(searchResults);
  // Validate pagination metadata
  TestValidator.equals("current page", searchResults.pagination.current, 1);
  TestValidator.equals("page limit", searchResults.pagination.limit, 10);
  TestValidator.predicate(
    "records count non-negative",
    searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    searchResults.pagination.pages >= 0,
  );
  // Validate that all returned images belong to the specified section
  for (const image of searchResults.data) {
    TestValidator.equals(
      "image belongs to correct section",
      image.section.id,
      section.id,
    );
    // Validate basic image metadata structure
    TestValidator.predicate("filename exists", image.filename.length > 0);
    TestValidator.predicate("mime type exists", image.mime_type.length > 0);
    TestValidator.predicate("file size non-negative", image.file_size >= 0);
    TestValidator.predicate("width non-negative", image.width >= 0);
    TestValidator.predicate("height non-negative", image.height >= 0);
    TestValidator.predicate("image type exists", image.image_type.length > 0);
    TestValidator.predicate(
      "storage path exists",
      image.storage_path.length > 0,
    );
  }
}
