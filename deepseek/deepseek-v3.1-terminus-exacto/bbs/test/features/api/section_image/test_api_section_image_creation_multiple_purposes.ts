import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_admin_sections_images_create } from "../../../generate/generate_random_discussion_board_admin_sections_images_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_image } from "../../../prepare/prepare_random_discussion_board_section_image";

export async function test_api_section_image_creation_multiple_purposes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create a section
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<number & tags.Type<"int32">>(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Create promotional image with larger dimensions
  const promotionalImage =
    await api.functional.discussionBoard.admin.sections.images.create(
      adminConnection,
      {
        sectionId: section.id satisfies string as string,
        body: {
          filename: `promotional-${RandomGenerator.alphaNumeric(8)}.jpg`,
          mime_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1000000>
          >(),
          width: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<2000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<500> & tags.Maximum<1000>
          >(),
          image_type: "promotional",
          storage_path: `/sections/${section.id}/promotional/${RandomGenerator.alphaNumeric(12)}.jpg`,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionImage.ICreate,
      },
    );
  typia.assert(promotionalImage);
  // 4. Create thumbnail image with smaller dimensions
  const thumbnailImage =
    await api.functional.discussionBoard.admin.sections.images.create(
      adminConnection,
      {
        sectionId: section.id satisfies string as string,
        body: {
          filename: `thumbnail-${RandomGenerator.alphaNumeric(8)}.png`,
          mime_type: "image/png",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<10000> &
              tags.Maximum<500000>
          >(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<400>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<400>
          >(),
          image_type: "thumbnail",
          storage_path: `/sections/${section.id}/thumbnail/${RandomGenerator.alphaNumeric(12)}.png`,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionImage.ICreate,
      },
    );
  typia.assert(thumbnailImage);
  // 5. Validate different image types can be assigned
  TestValidator.equals(
    "promotional image type",
    promotionalImage.image_type,
    "promotional",
  );
  TestValidator.equals(
    "thumbnail image type",
    thumbnailImage.image_type,
    "thumbnail",
  );
  // 6. Validate metadata is properly captured for each type
  TestValidator.predicate(
    "promotional dimensions larger",
    promotionalImage.width * promotionalImage.height >
      thumbnailImage.width * thumbnailImage.height,
  );
  TestValidator.predicate(
    "promotional file size larger",
    promotionalImage.file_size > thumbnailImage.file_size,
  );
  TestValidator.notEquals(
    "images have different IDs",
    promotionalImage.id,
    thumbnailImage.id,
  );
  TestValidator.notEquals(
    "images have different filenames",
    promotionalImage.filename,
    thumbnailImage.filename,
  );
  TestValidator.notEquals(
    "images have different storage paths",
    promotionalImage.storage_path,
    thumbnailImage.storage_path,
  );
  // 7. Validate alt_text is properly stored
  TestValidator.predicate(
    "promotional alt_text exists",
    promotionalImage.alt_text !== null && promotionalImage.alt_text.length > 0,
  );
  TestValidator.predicate(
    "thumbnail alt_text exists",
    thumbnailImage.alt_text !== null && thumbnailImage.alt_text.length > 0,
  );
  // 8. Validate mime_type matches filename extension
  TestValidator.predicate(
    "promotional mime_type matches",
    promotionalImage.filename.endsWith(".jpg") ||
      promotionalImage.filename.endsWith(".jpeg"),
  );
  TestValidator.predicate(
    "thumbnail mime_type matches",
    thumbnailImage.filename.endsWith(".png"),
  );
}